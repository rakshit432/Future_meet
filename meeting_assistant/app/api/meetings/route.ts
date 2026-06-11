import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { auth } from "../../../lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("=== GET /api/meetings START ===");
    
    const session = await auth();
    console.log("Session retrieved:", session);
    
    if (!session || !session.user) {
      console.log("GET /api/meetings: Unauthorized - no session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("GET /api/meetings: User authenticated -", session.user.email, "User ID:", session.user.id);
    
    const meetings = await prisma.meeting.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("GET /api/meetings: Found meetings:", meetings.length);
    console.log("=== GET /api/meetings SUCCESS ===");
    
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("=== GET /api/meetings ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("=== POST /api/meetings START ===");
    
    // Step 1: Get session
    console.log("Step 1: Getting session...");
    const session = await auth();
    console.log("Step 1: Session retrieved:", session);
    
    if (!session || !session.user) {
      console.log("POST /api/meetings: Unauthorized - no session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("POST /api/meetings: User authenticated -", session.user.email, "User ID:", session.user.id);

    // Step 2: Parse request body
    console.log("Step 2: Parsing request body...");
    const body = await request.json();
    console.log("Step 2: Received body:", body);
    
    const { meetingId, title, keyPoints, transcript, summary } = body;
    
    // Make sure keyPoints is an array before stringifying
    const processedKeyPoints = Array.isArray(keyPoints) ? keyPoints : [];
    
    console.log("POST /api/meetings: Processed key points:", processedKeyPoints);

    // Step 3: Create meeting in DB
    console.log("Step 3: Creating meeting in DB...");
    const meeting = await prisma.meeting.create({
      data: {
        userId: session.user.id,
        meetingId: meetingId || "unknown",
        title: title || "Untitled Meeting",
        keyPoints: JSON.stringify(processedKeyPoints),
        summary: summary || null,
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
    
    // Return the actual error message to client for debugging
    return NextResponse.json(
      { 
        error: `Internal Server Error: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
