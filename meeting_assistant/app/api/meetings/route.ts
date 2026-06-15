import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { auth } from "../../../lib/auth";

export const dynamic = 'force-dynamic';

/**
 * Resolves the authenticated user's actual DB record.
 *
 * Problem: After a DB reset, the browser still holds a valid JWT with the
 * *old* user ID. A new OAuth sign-in creates a fresh user record with a
 * different ID (or the same email but under a new CUID). Simply creating a
 * user with the old ID crashes with a unique-email constraint.
 *
 * Strategy:
 *  1. Try to find by the session's user.id  → ideal path
 *  2. If not found, try by email            → handles ID drift after DB reset
 *  3. If still not found, create a new record
 *
 * Returns the actual DB userId to use for all Prisma queries.
 */
async function resolveDbUserId(session: any): Promise<string> {
  // 1. Fast-path: user record with matching ID already exists
  const byId = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (byId) return byId.id;

  // 2. Try to find by email (handles the "ID drift after DB reset" scenario)
  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (byEmail) {
      console.log(
        `resolveDbUserId: session ID ${session.user.id} not in DB, ` +
        `but found matching email → using DB id ${byEmail.id}`
      );
      return byEmail.id;
    }
  }

  // 3. Neither exists – create a fresh record
  console.log(`resolveDbUserId: Creating new user for id=${session.user.id}`);
  const created = await prisma.user.create({
    data: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name || session.user.email || "Unknown User",
      image: session.user.image ?? null,
    },
  });
  return created.id;
}

export async function GET() {
  try {
    console.log("=== GET /api/meetings START ===");

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("GET /api/meetings: User authenticated -", session.user.email, "Session ID:", session.user.id);

    const userId = await resolveDbUserId(session);

    const meetings = await prisma.meeting.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    console.log("GET /api/meetings: Found meetings:", meetings.length);
    console.log("=== GET /api/meetings SUCCESS ===");

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("=== GET /api/meetings ERROR ===", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("=== POST /api/meetings START ===");

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("POST /api/meetings: User authenticated -", session.user.email, "Session ID:", session.user.id);

    // Resolve the real DB user id (handles ID/email drift)
    const userId = await resolveDbUserId(session);
    console.log("POST /api/meetings: Resolved DB userId:", userId);

    // Parse request body
    const body = await request.json();
    const { meetingId, title, keyPoints, transcript, summary } = body;

    const processedKeyPoints = Array.isArray(keyPoints) ? keyPoints : [];
    let finalSummary = summary;
    let finalKeyPoints = processedKeyPoints;

    // Optionally enrich with Gemini AI summarization
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && transcript && transcript.trim().length > 0) {
      try {
        console.log("POST /api/meetings: Calling Gemini for AI summarization...");

        const geminiPrompt = `You are an expert AI meeting analyst with deep expertise in understanding noisy, real-world speech-to-text output.

RAW TRANSCRIPT (from automatic speech recognition):
---
${transcript}
---

IMPORTANT CONTEXT about this transcript:
- It was captured live via a speech-to-text system, so it may contain errors, fragmented words, partial sentences, filler words ("ah", "um", "yeah"), and misheard words.
- Speakers may switch between languages (e.g., Hindi and English) mid-sentence.
- The same word may appear split across multiple short lines (e.g., "work" and "ing" → "working").
- Some lines may be single words or short fragments that form part of a longer thought.

STEP 1 — INTERPRET: First, mentally reconstruct what the speakers were actually trying to say. Read ALL the lines together as a continuous conversation and infer the true meaning even if individual lines look broken or incomplete. Account for code-switching and filler words.

STEP 2 — ANALYZE: Based on your interpretation, extract:
1. What was the meeting about?
2. What decisions or agreements were made?
3. What action items or next steps were mentioned?
4. Were any blockers, concerns, or important facts raised?

STEP 3 — OUTPUT: Return ONLY a valid JSON object (no markdown, no extra text) in this exact format:

{
  "summary": "A 3-5 sentence executive summary written in clear, professional English. Describe what the meeting covered, the key discussion points, and the outcome or current status — based on your best interpretation of the transcript.",
  "keyPoints": [
    "A specific, sentence-form key point, decision, or action item (e.g. 'Team agreed to finalize the UI by end of week')",
    "Another concrete point with context (e.g. 'Rakshit raised concern about the backend latency affecting transcription')",
    "Any important next step or blocker identified"
  ]
}

Rules:
- Write keyPoints as complete sentences with enough context to stand alone.
- Capture 3-10 key points — more is better if the meeting had rich content.
- If the transcript is very short, noisy, or unclear, do your absolute best to infer intent and still produce meaningful output.
- Do NOT say "the transcript is unclear" or "I cannot determine" — always produce your best interpretation.
- Preserve speaker names when mentioned.
- You MUST return only valid JSON.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                topP: 0.8,
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text.trim());
            if (parsed.summary) finalSummary = parsed.summary;
            if (Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0) {
              finalKeyPoints = parsed.keyPoints;
            }
            console.log("POST /api/meetings: AI summary generated successfully.");
          }
        } else {
          const errText = await response.text();
          console.warn("POST /api/meetings: Gemini API error", response.status, errText);
        }
      } catch (geminiError) {
        console.error("POST /api/meetings: Gemini summarization failed:", geminiError);
      }
    }

    console.log("POST /api/meetings: Processed key points:", finalKeyPoints);

    // Create meeting record — transcript is NOT stored (used only for AI analysis above)
    const meeting = await prisma.meeting.create({
      data: {
        userId,
        meetingId: meetingId || "unknown",
        title: title || "Untitled Meeting",
        keyPoints: JSON.stringify(finalKeyPoints),
        summary: finalSummary || null,
        transcript: null, // Raw transcript intentionally excluded from storage
      },
    });

    console.log("POST /api/meetings: Meeting created successfully -", meeting.id);
    console.log("=== POST /api/meetings SUCCESS ===");
    return NextResponse.json({ meeting });
  } catch (error: any) {
    console.error("=== POST /api/meetings ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: `Internal Server Error: ${error.message}`,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
