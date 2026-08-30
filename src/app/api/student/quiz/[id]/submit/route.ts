import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";
import { evaluateAnswer } from "@/lib/grading";

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
    const { studentIdNumber, studentName } = session;
    const body = await req.json();
    const { answers, isAutoSubmit } = body as {
      answers: Record<string, string>;
      isAutoSubmit?: boolean;
    };

    // Find submission
    const submission = await prisma.submission.findFirst({
      where: {
        quizId,
        studentIdNumber,
      },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "No active submission found for this quiz." },
        { status: 404 }
      );
    }

    if (submission.status === "SUBMITTED" || submission.status === "AUTO_SUBMITTED" || submission.status === "DISQUALIFIED") {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        score: submission.score,
        totalPoints: submission.totalPoints,
        status: submission.status,
      });
    }

    const submittedAt = new Date();
    const startedAt = new Date(submission.startedAt);
    const durationMinutes = submission.quiz.durationMinutes;

    // Server-authoritative timer validation (allowed duration + 2 mins network/device grace window)
    const allowedDurationMs = (durationMinutes * 60 + 120) * 1000;
    const actualElapsedMs = submittedAt.getTime() - startedAt.getTime();
    const isOverdue = actualElapsedMs > allowedDurationMs;

    let totalScore = 0;
    let totalPossiblePoints = 0;
    const evaluationBreakdown: any[] = [];

    // Evaluate each question server-side
    for (const question of submission.quiz.questions) {
      totalPossiblePoints += question.points;
      const studentAnswer = answers ? answers[question.id] || "" : "";

      let correctAnswers: string[] = [];
      try {
        correctAnswers = JSON.parse(question.correctAnswers);
      } catch {
        correctAnswers = [];
      }

      const evalResult = evaluateAnswer(studentAnswer, {
        type: question.type,
        points: question.points,
        correctAnswers,
        isCaseSensitive: question.isCaseSensitive,
        allowFuzzy: question.allowFuzzy,
        fuzzyThreshold: question.fuzzyThreshold,
      });

      totalScore += evalResult.pointsAwarded;

      // Upsert answer in database
      await prisma.submissionAnswer.upsert({
        where: {
          submissionId_questionId: {
            submissionId: submission.id,
            questionId: question.id,
          },
        },
        update: {
          studentAnswer,
          isCorrect: evalResult.isCorrect,
          pointsAwarded: evalResult.pointsAwarded,
          matchType: evalResult.matchType,
        },
        create: {
          submissionId: submission.id,
          questionId: question.id,
          studentAnswer,
          isCorrect: evalResult.isCorrect,
          pointsAwarded: evalResult.pointsAwarded,
          matchType: evalResult.matchType,
        },
      });

      evaluationBreakdown.push({
        questionId: question.id,
        prompt: question.prompt,
        type: question.type,
        points: question.points,
        studentAnswer,
        isCorrect: evalResult.isCorrect,
        pointsAwarded: evalResult.pointsAwarded,
        matchType: evalResult.matchType,
      });
    }

    const finalStatus = isAutoSubmit || isOverdue ? "AUTO_SUBMITTED" : "SUBMITTED";

    // Update submission record
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        score: totalScore,
        totalPoints: totalPossiblePoints,
        submittedAt,
        status: finalStatus,
        studentName: studentName || submission.studentName,
      },
    });

    return NextResponse.json({
      success: true,
      submissionId: updated.id,
      score: updated.score,
      totalPoints: updated.totalPoints,
      percentage: totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0,
      status: updated.status,
      submittedAt: updated.submittedAt,
      violationCount: updated.violationCount,
      breakdown: evaluationBreakdown,
    });
  } catch (error) {
    console.error("Submission grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade and finalize submission" },
      { status: 500 }
    );
  }
}
