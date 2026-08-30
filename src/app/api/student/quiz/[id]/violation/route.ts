import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// In-memory atomic debounce registry
const inMemoryViolationCooldowns = new Map<string, number>();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { studentIdNumber } = session;
    const body = await req.json();
    const { eventType, details } = body;

    // Find in-progress submission
    const submission = await prisma.submission.findFirst({
      where: {
        quizId,
        studentIdNumber,
        status: "IN_PROGRESS",
      },
      include: {
        quiz: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "No active submission session found" },
        { status: 404 }
      );
    }

    const maxViolations = submission.quiz.maxViolations;
    const now = Date.now();
    const lastMemoryTime = inMemoryViolationCooldowns.get(submission.id) || 0;

    // 1. In-memory atomic check (< 5 seconds)
    if (now - lastMemoryTime < 5000) {
      return NextResponse.json({
        success: true,
        violationCount: submission.violationCount,
        maxViolations,
        shouldAutoSubmit: submission.violationCount >= maxViolations,
        cooldown: true,
        warningMessage: `Integrity Warning: Infraction logged (${submission.violationCount}/${maxViolations} strikes).`,
      });
    }

    // Set in-memory timestamp immediately
    inMemoryViolationCooldowns.set(submission.id, now);

    // 2. Database Cooldown Check (< 5 seconds)
    const lastViolation = await prisma.violationLog.findFirst({
      where: { submissionId: submission.id },
      orderBy: { timestamp: "desc" },
    });

    const isDbCooldown =
      lastViolation && now - new Date(lastViolation.timestamp).getTime() < 5000;

    if (isDbCooldown) {
      return NextResponse.json({
        success: true,
        violationCount: submission.violationCount,
        maxViolations,
        shouldAutoSubmit: submission.violationCount >= maxViolations,
        cooldown: true,
        warningMessage: `Integrity Warning: Infraction logged (${submission.violationCount}/${maxViolations} strikes).`,
      });
    }

    // 3. Log the violation
    await prisma.violationLog.create({
      data: {
        submissionId: submission.id,
        eventType: eventType || "WINDOW_BLUR",
        details: details || "Client reported integrity infraction",
        timestamp: new Date(),
      },
    });

    // 4. Increment violation count by exactly 1
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        violationCount: {
          increment: 1,
        },
      },
    });

    const shouldAutoSubmit = updated.violationCount >= maxViolations;

    return NextResponse.json({
      success: true,
      violationCount: updated.violationCount,
      maxViolations,
      shouldAutoSubmit,
      warningMessage: shouldAutoSubmit
        ? `Integrity limit reached (${updated.violationCount}/${maxViolations} strikes). Your quiz is being auto-submitted.`
        : `Integrity Warning: Infraction logged (${updated.violationCount}/${maxViolations} strikes).`,
    });
  } catch (error) {
    console.error("Violation logging error:", error);
    return NextResponse.json(
      { error: "Failed to record violation" },
      { status: 500 }
    );
  }
}
