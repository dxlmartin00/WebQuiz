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
    const { studentIdNumber, studentName } = session;

    // Fetch quiz & check enrollment
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        subject: {
          include: {
            enrollments: {
              where: { studentIdNumber },
            },
          },
        },
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz.isPublished) {
      return NextResponse.json(
        { error: "This quiz has not been published yet." },
        { status: 403 }
      );
    }

    if (quiz.subject.enrollments.length === 0) {
      return NextResponse.json(
        { error: "You are not enrolled in the subject for this quiz." },
        { status: 403 }
      );
    }

    const now = new Date();
    if (quiz.deadlineAt && new Date(quiz.deadlineAt) < now) {
      return NextResponse.json(
        { error: "The deadline for this quiz has already passed." },
        { status: 403 }
      );
    }

    if (quiz.startAt && new Date(quiz.startAt) > now) {
      return NextResponse.json(
        { error: "This quiz is not open yet." },
        { status: 403 }
      );
    }

    // Check for existing submission
    let submission = await prisma.submission.findFirst({
      where: {
        quizId,
        studentIdNumber,
      },
      include: {
        answers: true,
      },
    });

    if (submission) {
      // If already submitted or auto-submitted, return completed submission
      if (
        submission.status === "SUBMITTED" ||
        submission.status === "AUTO_SUBMITTED" ||
        submission.status === "DISQUALIFIED"
      ) {
        return NextResponse.json(
          {
            error: "You have already completed and submitted this quiz.",
            isSubmitted: true,
            submission: {
              id: submission.id,
              score: submission.score,
              totalPoints: submission.totalPoints,
              status: submission.status,
              submittedAt: submission.submittedAt,
            },
          },
          { status: 400 }
        );
      }

      // Check if startedAt expired while in progress (e.g., from old seed data or stale test)
      const durationMs = quiz.durationMinutes * 60 * 1000;
      const elapsed = Date.now() - new Date(submission.startedAt).getTime();

      // If previous unsubmitted session started more than durationMs ago, reset startedAt to now so student has full time
      if (elapsed >= durationMs) {
        submission = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            startedAt: new Date(),
            violationCount: 0,
          },
          include: {
            answers: true,
          },
        });
      }
    } else {
      // Calculate total points
      const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

      // Create new In-Progress submission with server startedAt timestamp
      submission = await prisma.submission.create({
        data: {
          quizId,
          studentIdNumber,
          studentName,
          totalPoints,
          startedAt: new Date(),
          status: "IN_PROGRESS",
          violationCount: 0,
        },
        include: {
          answers: true,
        },
      });
    }

    // Server-authoritative timer calculation
    const startedAt = new Date(submission.startedAt).getTime();
    const durationMs = quiz.durationMinutes * 60 * 1000;
    const expiresAt = startedAt + durationMs;
    const remainingSeconds = Math.max(10, Math.floor((expiresAt - Date.now()) / 1000));

    // Prepare questions for student client (STRIPPING OUT correct answers for anti-cheat security)
    let processedQuestions = quiz.questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      // Shuffle choices if enabled
      if (quiz.shuffleChoices && parsedOptions.length > 1 && q.type === "MULTIPLE_CHOICE") {
        parsedOptions = [...parsedOptions].sort(() => Math.random() - 0.5);
      }

      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        options: parsedOptions,
        isCaseSensitive: q.isCaseSensitive,
        allowFuzzy: q.allowFuzzy,
        orderIndex: q.orderIndex,
      };
    });

    if (quiz.shuffleQuestions) {
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5);
    }

    // Map existing saved answers if any
    const savedAnswersMap: Record<string, string> = {};
    if (submission.answers) {
      for (const ans of submission.answers) {
        savedAnswersMap[ans.questionId] = ans.studentAnswer;
      }
    }

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        subjectCode: quiz.subject.subjectCode,
        subjectTitle: quiz.subject.title,
        durationMinutes: quiz.durationMinutes,
        maxViolations: quiz.maxViolations,
        totalQuestions: quiz.questions.length,
        totalPoints: submission.totalPoints,
      },
      submission: {
        id: submission.id,
        startedAt: submission.startedAt,
        violationCount: submission.violationCount,
        status: submission.status,
      },
      remainingSeconds,
      expiresAt: new Date(expiresAt).toISOString(),
      questions: processedQuestions,
      savedAnswers: savedAnswersMap,
    });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json(
      { error: "Failed to initialize quiz session" },
      { status: 500 }
    );
  }
}
