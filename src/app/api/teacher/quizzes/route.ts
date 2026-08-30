import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  // Multi-tenant isolation: Only fetch quizzes belonging to classes owned by THIS teacher
  const quizzes = await prisma.quiz.findMany({
    where: {
      subject: {
        teacherId: teacher.id,
      },
    },
    include: {
      subject: {
        select: {
          id: true,
          subjectCode: true,
          title: true,
          _count: { select: { enrollments: true } },
        },
      },
      questions: {
        select: { id: true, points: true },
      },
      submissions: {
        select: {
          id: true,
          score: true,
          totalPoints: true,
          status: true,
          violationCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = quizzes.map((q) => {
    const totalPoints = q.questions.reduce((sum, item) => sum + item.points, 0);
    const completedSubmissions = q.submissions.filter(
      (s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED"
    );
    const avgScore =
      completedSubmissions.length > 0
        ? completedSubmissions.reduce((sum, s) => sum + s.score, 0) /
          completedSubmissions.length
        : 0;
    const totalViolations = q.submissions.reduce(
      (sum, s) => sum + s.violationCount,
      0
    );

    return {
      id: q.id,
      title: q.title,
      description: q.description,
      subjectId: q.subject.id,
      subjectCode: q.subject.subjectCode,
      subjectTitle: q.subject.title,
      enrolledCount: q.subject._count.enrollments,
      durationMinutes: q.durationMinutes,
      maxViolations: q.maxViolations,
      isPublished: q.isPublished,
      shuffleQuestions: q.shuffleQuestions,
      shuffleChoices: q.shuffleChoices,
      deadlineAt: q.deadlineAt,
      startAt: q.startAt,
      totalQuestions: q.questions.length,
      totalPoints,
      submissionCount: q.submissions.length,
      completedCount: completedSubmissions.length,
      averageScore: avgScore,
      totalViolations,
      createdAt: q.createdAt,
    };
  });

  return NextResponse.json({ quizzes: formatted });
}

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const {
      subjectId,
      title,
      description,
      durationMinutes,
      deadlineAt,
      startAt,
      maxViolations,
      isPublished,
      shuffleQuestions,
      shuffleChoices,
      questions,
    } = body;

    if (!subjectId || !title) {
      return NextResponse.json(
        { error: "Subject and Title are required" },
        { status: 400 }
      );
    }

    // Verify the target subject is owned by THIS teacher
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, teacherId: teacher.id },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Class not found or unauthorized to create quizzes in this class." },
        { status: 404 }
      );
    }

    // Create Quiz
    const quiz = await prisma.quiz.create({
      data: {
        subjectId,
        title: title.trim(),
        description: description?.trim() || null,
        durationMinutes: Number(durationMinutes) || 30,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        startAt: startAt ? new Date(startAt) : null,
        maxViolations: Number(maxViolations) || 3,
        isPublished: !!isPublished,
        shuffleQuestions: !!shuffleQuestions,
        shuffleChoices: !!shuffleChoices,
      },
    });

    // Create Questions
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            type: q.type || "MULTIPLE_CHOICE",
            prompt: q.prompt?.trim() || "Untitled Question",
            points: Number(q.points) || 1,
            options: JSON.stringify(q.options || []),
            correctAnswers: JSON.stringify(q.correctAnswers || []),
            isCaseSensitive: !!q.isCaseSensitive,
            allowFuzzy: !!q.allowFuzzy,
            fuzzyThreshold: Number(q.fuzzyThreshold) || 1,
            orderIndex: i,
          },
        });
      }
    }

    const createdQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        subject: true,
      },
    });

    return NextResponse.json({ quiz: createdQuiz }, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
