import { NextResponse } from "next/server";
import prisma from "../../../../../lib/db";
import { auth } from "../../../../../lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    console.log("=== POST /api/meetings/[id]/summarize START ===");

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params if it is a Promise (compatible with Next.js dynamic routing APIs)
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;
    console.log(`POST /api/meetings/${meetingId}/summarize: Request received`);

    // 1. Fetch the meeting from the DB
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const transcript = meeting.transcript;
    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "No transcript available for this meeting to generate a summary." },
        { status: 400 }
      );
    }

    // 2. Initialize the Gemini client using official SDK
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        topP: 0.8,
      },
    });

    const geminiPrompt = `You are an expert AI meeting analyst with deep expertise in understanding noisy, real-world speech-to-text output.

RAW TRANSCRIPT (from automatic speech recognition):
---
${transcript}
---

IMPORTANT CONTEXT about this transcript:
- It was captured live via a speech-to-text system, so it may contain errors, fragmented words, partial sentences, filler words ("ah", "um", "yeah"), and misheard words.
- Speakers may switch between languages (e.g., Hindi and English) mid-sentence.
- The same word may appear split across multiple short lines.
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

    console.log("POST /api/meetings/[id]/summarize: Invoking Gemini API...");
    const result = await model.generateContent(geminiPrompt);
    const responseText = result.response.text();
    
    if (!responseText) {
      return NextResponse.json(
        { error: "Received empty response from Gemini API." },
        { status: 500 }
      );
    }

    console.log("POST /api/meetings/[id]/summarize: Processing Gemini response");
    const parsed = JSON.parse(responseText.trim());
    const finalSummary = parsed.summary || "No summary could be generated.";
    const finalKeyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [];

    // 3. Update the database record with the new summary and key points
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summary: finalSummary,
        keyPoints: JSON.stringify(finalKeyPoints),
      },
    });

    console.log(`POST /api/meetings/${meetingId}/summarize: DB updated successfully`);
    console.log("=== POST /api/meetings/[id]/summarize SUCCESS ===");

    return NextResponse.json({
      success: true,
      summary: updatedMeeting.summary,
      keyPoints: JSON.parse(updatedMeeting.keyPoints || "[]"),
    });

  } catch (error: any) {
    console.error("=== POST /api/meetings/[id]/summarize ERROR ===", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate meeting summary." },
      { status: 500 }
    );
  }
}
