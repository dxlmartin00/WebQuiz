import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const isApproved = (session?.user as any)?.isApproved;

  if (!teacherId || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApproved) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  // Multi-tenant isolation: Only fetch quizzes belonging to classes owned by THIS teacher
  const quizzes = await prisma.quiz.findMany({
    where: {
      subject: {
        teacherId,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      maxViolations: true,
      isPublished: true,
      shuffleQuestions: true,
      shuffleChoices: true,
      deadlineAt: true,
      startAt: true,
      createdAt: true,
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
          status: true,
          violationCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = quizzes.map((q) => {
    const totalPoints = q.questions.reduce((sum, item) => sum + item.points, 0);
    let completedCount = 0;
    let totalViolations = 0;
    let scoreSum = 0;

    for (const s of q.submissions) {
      totalViolations += s.violationCount;
      if (s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED") {
        completedCount++;
        scoreSum += s.score;
      }
    }

    const avgScore = completedCount > 0 ? scoreSum / completedCount : 0;

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
      completedCount,
      averageScore: avgScore,
      totalViolations,
      createdAt: q.createdAt,
    };
  });

  return NextResponse.json({ quizzes: formatted }, {
    headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  const isApproved = (session?.user as any)?.isApproved;

  if (!teacherId || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApproved) {
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
      where: { id: subjectId, teacherId },
      select: { id: true },
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

    // Bulk insert questions in a single query for maximum performance
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionRecords = questions.map((q, i) => ({
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
      }));

      await prisma.question.createMany({
        data: questionRecords,
      });
    }

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
