import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";
import { logSystemError } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let studentIdNumber: string | undefined;
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    studentIdNumber = session.studentIdNumber;
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

    const entries = Object.entries(answers);
    if (entries.length === 0) {
      return NextResponse.json({ success: true, savedCount: 0 });
    }

    // Resilient upsert with P2002 race-condition fallback
    // In concurrent multi-student exam environments, rapid successive saves or network retries
    // can attempt to insert the same (submissionId, questionId) at the exact same millisecond.
    // If P2002 (Unique constraint failed) is caught, the competing thread already created the row,
    // so we safely update it without throwing a 500 error.
    await Promise.all(
      entries.map(async ([questionId, studentAnswer]) => {
        const answerStr = String(studentAnswer ?? "");
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await prisma.submissionAnswer.upsert({
              where: {
                submissionId_questionId: {
                  submissionId: submission.id,
                  questionId,
                },
              },
              update: {
                studentAnswer: answerStr,
              },
              create: {
                submissionId: submission.id,
                questionId,
                studentAnswer: answerStr,
                isCorrect: false,
                pointsAwarded: 0,
              },
            });
            return;
          } catch (err: any) {
            if (err?.code === "P2002") {
              try {
                await prisma.submissionAnswer.update({
                  where: {
                    submissionId_questionId: {
                      submissionId: submission.id,
                      questionId,
                    },
                  },
                  data: {
                    studentAnswer: answerStr,
                  },
                });
                return;
              } catch {
                // If update fails on rare edge case, retry loop will attempt upsert once more
              }
            } else {
              throw err;
            }
          }
        }
      })
    );

    return NextResponse.json({ success: true, savedCount: entries.length });
  } catch (error: any) {
    const { id } = await params;
    await logSystemError({
      endpoint: `/api/student/quiz/${id}/save`,
      method: "POST",
      statusCode: 500,
      error,
      userId: studentIdNumber,
      userRole: "STUDENT",
    });
    return NextResponse.json({ error: "Autosave failed" }, { status: 500 });
  }
}
