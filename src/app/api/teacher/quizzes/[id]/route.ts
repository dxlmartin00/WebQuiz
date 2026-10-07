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
    select: { id: true, isApproved: true },
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
    timePerMcSeconds,
    timePerTfSeconds,
    timePerSaSeconds,
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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
    }

    // 1. Update quiz settings
    await prisma.quiz.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        durationMinutes: Number(durationMinutes) || 30,
        timerMode: timerMode === "PER_ITEM" ? "PER_ITEM" : "WHOLE_QUIZ",
        timePerItemSeconds: timerMode === "PER_ITEM" ? (Number(timePerItemSeconds) || 60) : (timePerItemSeconds ? Number(timePerItemSeconds) : 60),
        timePerMcSeconds: timerMode === "PER_ITEM" ? (Number(timePerMcSeconds) || 45) : (timePerMcSeconds ? Number(timePerMcSeconds) : 45),
        timePerTfSeconds: timerMode === "PER_ITEM" ? (Number(timePerTfSeconds) || 30) : (timePerTfSeconds ? Number(timePerTfSeconds) : 30),
        timePerSaSeconds: timerMode === "PER_ITEM" ? (Number(timePerSaSeconds) || 60) : (timePerSaSeconds ? Number(timePerSaSeconds) : 60),
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        startAt: startAt ? new Date(startAt) : null,
        maxViolations: Number(maxViolations) || 3,
        isPublished: !!isPublished,
        shuffleQuestions: !!shuffleQuestions,
        shuffleChoices: !!shuffleChoices,
      },
    });

    if (questions && Array.isArray(questions)) {
      // 2. Fetch existing questions to update them in place rather than blind deletion (preserving question ID & student answers)
      const existingQuestions = await prisma.question.findMany({
        where: { quizId: id },
      });
      const existingMap = new Map(existingQuestions.map((eq) => [eq.id, eq]));

      const questionsToUpdate: Array<{ id: string; data: any }> = [];
      const questionsToCreate: any[] = [];
      const retainedIds = new Set<string>();

      let hasGradingChanges = false;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const type = q.type || "MULTIPLE_CHOICE";
        const prompt = q.prompt?.trim() || "Untitled Question";
        const points = type === "INSTRUCTION" ? 0 : (Number(q.points) || 1);
        const optionsStr = JSON.stringify(q.options || []);
        const correctAnswersStr = JSON.stringify(q.correctAnswers || []);
        const isCaseSensitive = !!q.isCaseSensitive;
        const allowFuzzy = !!q.allowFuzzy;
        const fuzzyThreshold = Number(q.fuzzyThreshold) || 1;
        const orderIndex = i;

        const questionData = {
          type,
          prompt,
          points,
          options: optionsStr,
          correctAnswers: correctAnswersStr,
          isCaseSensitive,
          allowFuzzy,
          fuzzyThreshold,
          orderIndex,
        };

        if (q.id && existingMap.has(q.id)) {
          retainedIds.add(q.id);
          const eq = existingMap.get(q.id)!;

          // Check if grading parameters changed
          const gradingChanged =
            eq.type !== type ||
            eq.points !== points ||
            eq.correctAnswers !== correctAnswersStr ||
            eq.isCaseSensitive !== isCaseSensitive ||
            eq.allowFuzzy !== allowFuzzy ||
            eq.fuzzyThreshold !== fuzzyThreshold;

          if (gradingChanged) {
            hasGradingChanges = true;
          }

          // Check if ANY field changed
          const anyFieldChanged =
            gradingChanged ||
            eq.prompt !== prompt ||
            eq.options !== optionsStr ||
            eq.orderIndex !== orderIndex;

          if (anyFieldChanged) {
            questionsToUpdate.push({ id: q.id, data: questionData });
          }
        } else {
          // New question added
          questionsToCreate.push({
            quizId: id,
            ...questionData,
          });
          if (type !== "INSTRUCTION" && points > 0) {
            hasGradingChanges = true;
          }
        }
      }

      // Check for removed questions
      const removedQuestionIds = existingQuestions
        .filter((eq) => !retainedIds.has(eq.id))
        .map((eq) => eq.id);

      if (removedQuestionIds.length > 0) {
        hasGradingChanges = true;
      }

      // 3. Concurrently update changed questions in parallel batches (chunk size 20)
      for (let i = 0; i < questionsToUpdate.length; i += 20) {
        const batch = questionsToUpdate.slice(i, i + 20);
        await Promise.all(
          batch.map((item) =>
            prisma.question.update({
              where: { id: item.id },
              data: item.data,
            })
          )
        );
      }

      // 4. Bulk insert newly added questions in a single query
      if (questionsToCreate.length > 0) {
        await prisma.question.createMany({
          data: questionsToCreate,
        });
      }

      // 5. Delete removed questions in a single query
      if (removedQuestionIds.length > 0) {
        await prisma.question.deleteMany({
          where: { id: { in: removedQuestionIds } },
        });
      }

      // 6. Submission Re-scoring: ONLY run if grading rules, points, or questions actually changed!
      // This completely skips submissions re-scoring when only editing titles, deadlines, prompts, or options text.
      if (hasGradingChanges) {
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

        if (completedSubmissions.length > 0) {
          const answerUpdates: Array<{ id: string; isCorrect: boolean; pointsAwarded: number; matchType: string }> = [];
          const submissionUpdates: Array<{ id: string; score: number; totalPoints: number }> = [];

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

                // ONLY queue answer update if points or correctness actually changed!
                if (
                  existingAns.pointsAwarded !== evalResult.pointsAwarded ||
                  existingAns.isCorrect !== evalResult.isCorrect ||
                  existingAns.matchType !== evalResult.matchType
                ) {
                  answerUpdates.push({
                    id: existingAns.id,
                    isCorrect: evalResult.isCorrect,
                    pointsAwarded: evalResult.pointsAwarded,
                    matchType: evalResult.matchType,
                  });
                }
              }
            }

            if (sub.score !== newScore || sub.totalPoints !== freshTotalPoints) {
              submissionUpdates.push({
                id: sub.id,
                score: newScore,
                totalPoints: freshTotalPoints,
              });
            }
          }

          // Execute changed answer updates concurrently in parallel batches of 25
          for (let i = 0; i < answerUpdates.length; i += 25) {
            const batch = answerUpdates.slice(i, i + 25);
            await Promise.all(
              batch.map((ans) =>
                prisma.submissionAnswer.update({
                  where: { id: ans.id },
                  data: {
                    isCorrect: ans.isCorrect,
                    pointsAwarded: ans.pointsAwarded,
                    matchType: ans.matchType,
                  },
                })
              )
            );
          }

          // Execute changed submission updates in parallel batches of 25
          for (let i = 0; i < submissionUpdates.length; i += 25) {
            const batch = submissionUpdates.slice(i, i + 25);
            await Promise.all(
              batch.map((s) =>
                prisma.submission.update({
                  where: { id: s.id },
                  data: {
                    score: s.score,
                    totalPoints: s.totalPoints,
                  },
                })
              )
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, id });
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
