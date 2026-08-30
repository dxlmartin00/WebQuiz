import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

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
    const { answers } = body as { answers: Record<string, string> };

    if (!answers) {
      return NextResponse.json({ success: true });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        quizId,
        studentIdNumber,
        status: "IN_PROGRESS",
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Active submission not found" },
        { status: 404 }
      );
    }

    // Upsert answers
    for (const [questionId, studentAnswer] of Object.entries(answers)) {
      await prisma.submissionAnswer.upsert({
        where: {
          submissionId_questionId: {
            submissionId: submission.id,
            questionId,
          },
        },
        update: {
          studentAnswer: String(studentAnswer || ""),
        },
        create: {
          submissionId: submission.id,
          questionId,
          studentAnswer: String(studentAnswer || ""),
          isCorrect: false,
          pointsAwarded: 0,
        },
      });
    }

    return NextResponse.json({ success: true, savedCount: Object.keys(answers).length });
  } catch (error) {
    console.error("Autosave error:", error);
    return NextResponse.json({ error: "Autosave failed" }, { status: 500 });
  }
}
