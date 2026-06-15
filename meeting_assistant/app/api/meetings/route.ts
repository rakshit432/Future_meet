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
    const { meetingId, title, transcript } = body;

    // Create meeting record — transcript is saved directly
    const meeting = await prisma.meeting.create({
      data: {
        userId,
        meetingId: meetingId || "unknown",
        title: title || "Untitled Meeting",
        keyPoints: JSON.stringify([]),
        summary: null,
        transcript: transcript || null,
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
