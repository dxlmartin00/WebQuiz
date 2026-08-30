import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        startAt: startAt ? new Date(startAt) : null,
        maxViolations: Number(maxViolations) || 3,
        isPublished: !!isPublished,
        shuffleQuestions: !!shuffleQuestions,
        shuffleChoices: !!shuffleChoices,
      },
    });

    if (questions && Array.isArray(questions)) {
      await prisma.question.deleteMany({
        where: { quizId: id },
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await prisma.question.create({
          data: {
            quizId: id,
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
