import { NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { auth } from "../../../../lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    console.log("=== DELETE /api/meetings/[id] START ===");

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const meetingId = resolvedParams.id;
    console.log(`DELETE /api/meetings/${meetingId}: Request received`);

    // Verify ownership of the meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Find the real DB user id (consistent with route.ts resolveDbUserId logic)
    const byId = await prisma.user.findUnique({ where: { id: session.user.id } });
    let dbUserId = byId ? byId.id : null;

    if (!dbUserId && session.user.email) {
      const byEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      if (byEmail) dbUserId = byEmail.id;
    }

    if (!dbUserId) {
      dbUserId = session.user.id;
    }

    if (meeting.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden: You do not own this meeting" }, { status: 403 });
    }

    // Delete meeting
    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    console.log(`DELETE /api/meetings/${meetingId}: Deleted successfully`);
    console.log("=== DELETE /api/meetings/[id] SUCCESS ===");

    return NextResponse.json({ success: true, message: "Meeting deleted successfully" });

  } catch (error: any) {
    console.error("=== DELETE /api/meetings/[id] ERROR ===", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete meeting." },
      { status: 500 }
    );
  }
}
