import { prisma } from "@/lib/prisma";
import { evaluateAnswer } from "@/lib/grading";

export function isSubmissionExpired(
  submission: { startedAt: Date | string; status: string },
  quiz: {
    deadlineAt: Date | string | null;
    durationMinutes: number;
    timerMode: string;
    timePerItemSeconds?: number | null;
    timePerMcSeconds?: number | null;
    timePerTfSeconds?: number | null;
    timePerSaSeconds?: number | null;
    questions?: Array<{ type: string }>;
  },
  now = new Date()
): boolean {
  if (submission.status !== "IN_PROGRESS") return false;

  const nowMs = now.getTime();
  const startedMs = new Date(submission.startedAt).getTime();

  // 1. Check if quiz deadline has passed
  if (quiz.deadlineAt && new Date(quiz.deadlineAt).getTime() < nowMs) {
    return true;
  }

  // 2. Check if student's exam timer has elapsed (+ 2 minutes network/device grace window)
  let allowedMs = (quiz.durationMinutes * 60 + 120) * 1000;
  if (quiz.timerMode === "PER_ITEM" && quiz.questions) {
    const totalPacedSec = quiz.questions.reduce((sum, q) => {
      if (q.type === "INSTRUCTION") return sum;
      if (q.type === "MULTIPLE_CHOICE") return sum + (quiz.timePerMcSeconds || quiz.timePerItemSeconds || 45);
      if (q.type === "TRUE_FALSE") return sum + (quiz.timePerTfSeconds || quiz.timePerItemSeconds || 30);
      if (q.type === "SHORT_ANSWER") return sum + (quiz.timePerSaSeconds || quiz.timePerItemSeconds || 60);
      return sum + (quiz.timePerItemSeconds || 60);
    }, 0);
    allowedMs = (totalPacedSec + 120) * 1000;
  }

  return nowMs - startedMs > allowedMs;
}

export async function finalizeExpiredSubmission(
  submission: {
    id: string;
    startedAt: Date | string;
    answers?: Array<{
      id?: string;
      questionId: string;
      studentAnswer: string;
    }>;
  },
  quizQuestions: Array<{
    id: string;
    type: string;
    points: number;
    correctAnswers: string;
    isCaseSensitive?: boolean;
    allowFuzzy?: boolean;
    fuzzyThreshold?: number | null;
  }>,
  submittedAtDate = new Date()
) {
  const existingAnswersMap = new Map<string, string>();
  for (const a of submission.answers || []) {
    existingAnswersMap.set(a.questionId, a.studentAnswer);
  }

  let totalScore = 0;
  const answersToPersist: Array<{
    submissionId: string;
    questionId: string;
    studentAnswer: string;
    isCorrect: boolean;
    pointsAwarded: number;
    matchType: "EXACT" | "SYNONYM" | "FUZZY" | "INCORRECT";
  }> = [];

  for (const q of quizQuestions) {
    if (q.type === "INSTRUCTION") continue;
    const studentAnswer = existingAnswersMap.get(q.id) || "";
    let correctAnswers: string[] = [];
    try {
      correctAnswers = JSON.parse(q.correctAnswers);
    } catch {
      correctAnswers = [];
    }

    const evalResult = evaluateAnswer(studentAnswer, {
      type: q.type,
      points: q.points,
      correctAnswers,
      isCaseSensitive: q.isCaseSensitive,
      allowFuzzy: q.allowFuzzy,
      fuzzyThreshold: q.fuzzyThreshold ?? 1,
    });

    totalScore += evalResult.pointsAwarded;
    answersToPersist.push({
      submissionId: submission.id,
      questionId: q.id,
      studentAnswer,
      isCorrect: evalResult.isCorrect,
      pointsAwarded: evalResult.pointsAwarded,
      matchType: evalResult.matchType,
    });
  }

  // Atomically persist evaluated answers and update submission status in ONE single batch transaction
  const txOps: any[] = [
    prisma.submissionAnswer.deleteMany({
      where: { submissionId: submission.id },
    }),
  ];

  if (answersToPersist.length > 0) {
    txOps.push(
      prisma.submissionAnswer.createMany({
        data: answersToPersist,
        skipDuplicates: true,
      })
    );
  }

  txOps.push(
    prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "AUTO_SUBMITTED",
        score: totalScore,
        submittedAt: submittedAtDate,
      },
    })
  );

  const txResults = await prisma.$transaction(txOps);
  const updatedSubmission = txResults[txResults.length - 1];

  return {
    ...updatedSubmission,
    evaluatedAnswers: answersToPersist,
  };
}
