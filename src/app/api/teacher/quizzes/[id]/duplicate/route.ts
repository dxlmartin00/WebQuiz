import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;
    const isApproved = (session?.user as any)?.isApproved;

    if (!teacherId || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isApproved) {
      return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
    }

    const { id: sourceQuizId } = await params;
    const body = await req.json();
    const { targetSubjectId, title } = body as { targetSubjectId?: string; title?: string };

    if (!targetSubjectId) {
      return NextResponse.json(
        { error: "Target Subject Class is required." },
        { status: 400 }
      );
    }

    // 1. Verify source quiz belongs to this teacher
    const sourceQuiz = await prisma.quiz.findFirst({
      where: { id: sourceQuizId, subject: { teacherId } },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!sourceQuiz) {
      return NextResponse.json(
        { error: "Source quiz not found or unauthorized." },
        { status: 404 }
      );
    }

    // 2. Verify target subject belongs to this teacher
    const targetSubject = await prisma.subject.findFirst({
      where: { id: targetSubjectId, teacherId },
      select: { id: true, subjectCode: true, title: true },
    });

    if (!targetSubject) {
      return NextResponse.json(
        { error: "Target class not found or unauthorized." },
        { status: 404 }
      );
    }

    const newTitle = title?.trim() || `${sourceQuiz.title} (Copy)`;

    // 3. Atomically create duplicate quiz and copy all questions
    const questionRecords = sourceQuiz.questions.map((q, idx) => ({
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      options: q.options,
      correctAnswers: q.correctAnswers,
      isCaseSensitive: q.isCaseSensitive,
      allowFuzzy: q.allowFuzzy,
      fuzzyThreshold: q.fuzzyThreshold,
      orderIndex: idx,
    }));

    const newQuiz = await prisma.quiz.create({
      data: {
        subjectId: targetSubject.id,
        title: newTitle,
        description: sourceQuiz.description,
        durationMinutes: sourceQuiz.durationMinutes,
        timerMode: sourceQuiz.timerMode,
        timePerItemSeconds: sourceQuiz.timePerItemSeconds,
        maxViolations: sourceQuiz.maxViolations,
        isPublished: false, // Default to draft so teacher can adjust dates/rules
        shuffleQuestions: sourceQuiz.shuffleQuestions,
        shuffleChoices: sourceQuiz.shuffleChoices,
        startAt: null,
        deadlineAt: null,
        questions: questionRecords.length > 0 ? {
          createMany: {
            data: questionRecords,
          },
        } : undefined,
      },
      select: { id: true, title: true, subjectId: true },
    });

    return NextResponse.json({
      success: true,
      quiz: newQuiz,
      message: `Quiz successfully duplicated to ${targetSubject.subjectCode} - ${targetSubject.title}.`,
    });
  } catch (error: any) {
    console.error("Duplicate quiz error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to duplicate quiz" },
      { status: 500 }
    );
  }
}
