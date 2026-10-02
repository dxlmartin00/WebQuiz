import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAnswer } from "@/lib/grading";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: {
      id,
      subject: { teacherId: teacher.id }, // Strict owner check
    },
    include: {
      subject: true,
      questions: {
        orderBy: { orderIndex: "asc" },
      },
      submissions: {
        include: {
          answers: true,
          violationLogs: true,
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
  }

  const formattedQuestions = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    options: JSON.parse(q.options || "[]"),
    correctAnswers: JSON.parse(q.correctAnswers || "[]"),
    isCaseSensitive: q.isCaseSensitive,
    allowFuzzy: q.allowFuzzy,
    fuzzyThreshold: q.fuzzyThreshold,
    orderIndex: q.orderIndex,
  }));

  return NextResponse.json({
    quiz: {
      ...quiz,
      questions: formattedQuestions,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    title,
    description,
    durationMinutes,
    timerMode,
    timePerItemSeconds,
    deadlineAt,
    startAt,
    maxViolations,
    isPublished,
    shuffleQuestions,
    shuffleChoices,
    questions,
  } = body;

  try {
    const existing = await prisma.quiz.findFirst({
      where: { id, subject: { teacherId: teacher.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
    }

    await prisma.quiz.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        durationMinutes: Number(durationMinutes) || 30,
        timerMode: timerMode === "PER_ITEM" ? "PER_ITEM" : "WHOLE_QUIZ",
        timePerItemSeconds: timerMode === "PER_ITEM" ? (Number(timePerItemSeconds) || 60) : (timePerItemSeconds ? Number(timePerItemSeconds) : 60),
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        startAt: startAt ? new Date(startAt) : null,
        maxViolations: Number(maxViolations) || 3,
        isPublished: !!isPublished,
        shuffleQuestions: !!shuffleQuestions,
        shuffleChoices: !!shuffleChoices,
      },
    });

    if (questions && Array.isArray(questions)) {
      // 1. Fetch existing questions to update them in place rather than blind deletion (which cascades and deletes student answers)
      const existingQuestions = await prisma.question.findMany({
        where: { quizId: id },
      });
      const existingMap = new Map(existingQuestions.map((eq) => [eq.id, eq]));

      // 2. Update existing questions or create new ones
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionData = {
          type: q.type || "MULTIPLE_CHOICE",
          prompt: q.prompt?.trim() || "Untitled Question",
          points: q.type === "INSTRUCTION" ? 0 : (Number(q.points) || 1),
          options: JSON.stringify(q.options || []),
          correctAnswers: JSON.stringify(q.correctAnswers || []),
          isCaseSensitive: !!q.isCaseSensitive,
          allowFuzzy: !!q.allowFuzzy,
          fuzzyThreshold: Number(q.fuzzyThreshold) || 1,
          orderIndex: i,
        };

        if (q.id && existingMap.has(q.id)) {
          // Update in place preserving question ID & all student answers
          await prisma.question.update({
            where: { id: q.id },
            data: questionData,
          });
        } else {
          // Create newly added question
          await prisma.question.create({
            data: {
              quizId: id,
              ...questionData,
            },
          });
        }
      }

      // 3. Remove only questions that were explicitly deleted by the teacher
      const retainedIds = new Set(
        questions.filter((q: any) => q.id && existingMap.has(q.id)).map((q: any) => q.id)
      );
      const removedQuestionIds = existingQuestions
        .filter((eq) => !retainedIds.has(eq.id))
        .map((eq) => eq.id);

      if (removedQuestionIds.length > 0) {
        await prisma.question.deleteMany({
          where: { id: { in: removedQuestionIds } },
        });
      }

      // 4. Automatically re-evaluate and re-score all completed student submissions
      // This ensures grades and answer evaluations reflect updated answer keys/points instantly
      const freshQuestions = await prisma.question.findMany({
        where: { quizId: id },
      });

      const freshTotalPoints = freshQuestions.reduce(
        (sum, q) => sum + (q.type === "INSTRUCTION" ? 0 : q.points),
        0
      );

      const completedSubmissions = await prisma.submission.findMany({
        where: {
          quizId: id,
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        },
        include: {
          answers: true,
        },
      });

      for (const sub of completedSubmissions) {
        let newScore = 0;
        const answerMap = new Map(sub.answers.map((a) => [a.questionId, a]));

        for (const q of freshQuestions) {
          if (q.type === "INSTRUCTION") continue;

          const existingAns = answerMap.get(q.id);
          if (existingAns) {
            let correctAnswers: string[] = [];
            try {
              correctAnswers = JSON.parse(q.correctAnswers);
            } catch {
              correctAnswers = [];
            }

            const evalResult = evaluateAnswer(existingAns.studentAnswer, {
              type: q.type,
              points: q.points,
              correctAnswers,
              isCaseSensitive: q.isCaseSensitive,
              allowFuzzy: q.allowFuzzy,
              fuzzyThreshold: q.fuzzyThreshold,
            });

            newScore += evalResult.pointsAwarded;

            await prisma.submissionAnswer.update({
              where: { id: existingAns.id },
              data: {
                isCorrect: evalResult.isCorrect,
                pointsAwarded: evalResult.pointsAwarded,
                matchType: evalResult.matchType,
              },
            });
          }
        }

        await prisma.submission.update({
          where: { id: sub.id },
          data: {
            score: newScore,
            totalPoints: freshTotalPoints,
          },
        });
      }
    }

    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        subject: true,
      },
    });

    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!teacher || !teacher.isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.quiz.findFirst({
      where: { id, subject: { teacherId: teacher.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
    }

    await prisma.quiz.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
