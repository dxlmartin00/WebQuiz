import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSubmissionExpired, finalizeExpiredSubmission } from "@/lib/auto-finalize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
  });

  if (!teacher || (!teacher.isApproved && !isAdmin)) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const isUserAdmin = isAdmin || teacher.role === "ADMIN";
  const { id: quizId } = await params;

  // Strict ownership check (Admins can view any quiz)
  const quiz = await prisma.quiz.findFirst({
    where: isUserAdmin
      ? { id: quizId }
      : { id: quizId, subject: { teacherId: teacher.id } },
    include: {
      subject: {
        include: {
          enrollments: true,
        },
      },
      questions: {
        orderBy: { orderIndex: "asc" },
      },
      submissions: {
        include: {
          answers: {
            include: {
              question: true,
            },
          },
          violationLogs: {
            orderBy: { timestamp: "desc" },
          },
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
  }

  // Auto-finalize any in-progress submissions that expired due to time or deadline
  const now = new Date();
  for (let i = 0; i < quiz.submissions.length; i++) {
    const s = quiz.submissions[i];
    if (s.status === "IN_PROGRESS" && isSubmissionExpired(s, quiz, now)) {
      try {
        const finalized = await finalizeExpiredSubmission(s, quiz.questions, now);
        s.status = "AUTO_SUBMITTED";
        s.score = finalized.score;
        s.submittedAt = finalized.submittedAt;
        const ansMap = new Map<string, any>(finalized.evaluatedAnswers.map((a: any) => [a.questionId, a]));
        s.answers = quiz.questions
          .filter((q) => q.type !== "INSTRUCTION")
          .map((q) => {
            const ev: any = ansMap.get(q.id);
            return {
              id: `${s.id}_${q.id}`,
              submissionId: s.id,
              questionId: q.id,
              studentAnswer: ev?.studentAnswer || "",
              isCorrect: ev?.isCorrect || false,
              pointsAwarded: ev?.pointsAwarded || 0,
              matchType: ev?.matchType || "INCORRECT",
              question: q,
            } as any;
          });
      } catch (err) {
        console.error(`Error auto-finalizing expired submission ${s.id}:`, err);
      }
    }
  }

  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.type === "INSTRUCTION" ? 0 : q.points), 0);

  const submissionMap = new Map();
  for (const s of quiz.submissions) {
    submissionMap.set(s.studentIdNumber, s);
  }

  const fullRosterStatus = quiz.subject.enrollments.map((enrolled) => {
    const sub = submissionMap.get(enrolled.studentIdNumber);
    return {
      studentIdNumber: enrolled.studentIdNumber,
      studentName: enrolled.studentName,
      hasSubmitted: !!sub && (sub.status === "SUBMITTED" || sub.status === "AUTO_SUBMITTED"),
      status: sub ? sub.status : "NOT_STARTED",
      score: sub ? sub.score : 0,
      totalPoints,
      percentage: sub && totalPoints > 0 ? (sub.score / totalPoints) * 100 : 0,
      violationCount: sub ? sub.violationCount : 0,
      startedAt: sub ? sub.startedAt : null,
      submittedAt: sub ? sub.submittedAt : null,
      submissionId: sub ? sub.id : null,
      violationLogs: sub ? sub.violationLogs : [],
      answers: sub
        ? sub.answers.map((a: any) => ({
            questionId: a.questionId,
            prompt: a.question.prompt,
            type: a.question.type,
            studentAnswer: a.studentAnswer,
            isCorrect: a.isCorrect,
            pointsAwarded: a.pointsAwarded,
            matchType: a.matchType,
          }))
        : [],
    };
  });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      subjectCode: quiz.subject.subjectCode,
      subjectTitle: quiz.subject.title,
      totalPoints,
      durationMinutes: quiz.durationMinutes,
      timerMode: quiz.timerMode,
      timePerItemSeconds: quiz.timePerItemSeconds,
      timePerMcSeconds: quiz.timePerMcSeconds,
      timePerTfSeconds: quiz.timePerTfSeconds,
      timePerSaSeconds: quiz.timePerSaSeconds,
      maxViolations: quiz.maxViolations,
      isPublished: quiz.isPublished,
      startAt: quiz.startAt,
      deadlineAt: quiz.deadlineAt,
      questions: quiz.questions.map((q) => {
        let options: string[] = [];
        let correctAnswers: string[] = [];
        try { options = JSON.parse(q.options || "[]"); } catch {}
        try { correctAnswers = JSON.parse(q.correctAnswers || "[]"); } catch {}
        return {
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          points: q.points,
          options,
          correctAnswers,
          orderIndex: q.orderIndex,
        };
      }),
    },
    stats: {
      enrolledTotal: quiz.subject.enrollments.length,
      submittedCount: quiz.submissions.filter((s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED").length,
      totalViolations: quiz.submissions.reduce((acc, s) => acc + s.violationCount, 0),
      averageScore:
        quiz.submissions.length > 0
          ? quiz.submissions.reduce((acc, s) => acc + s.score, 0) / quiz.submissions.length
          : 0,
    },
    submissions: fullRosterStatus,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
  });

  if (!teacher || (!teacher.isApproved && !isAdmin)) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const isUserAdmin = isAdmin || teacher.role === "ADMIN";
  const { id: quizId } = await params;

  // Strict ownership check (Admins can manage any quiz)
  const quiz = await prisma.quiz.findFirst({
    where: isUserAdmin
      ? { id: quizId }
      : { id: quizId, subject: { teacherId: teacher.id } },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  let studentIdNumber = searchParams.get("studentIdNumber");
  let submissionId = searchParams.get("submissionId");

  if (!studentIdNumber && !submissionId) {
    try {
      const body = await req.json();
      studentIdNumber = body.studentIdNumber;
      submissionId = body.submissionId;
    } catch {
      // body optional
    }
  }

  if (!studentIdNumber && !submissionId) {
    return NextResponse.json(
      { error: "studentIdNumber or submissionId is required to reset attempt" },
      { status: 400 }
    );
  }

  try {
    const deleteWhere: any = { quizId };
    if (submissionId) {
      deleteWhere.id = submissionId;
    } else if (studentIdNumber) {
      deleteWhere.studentIdNumber = studentIdNumber.trim().toUpperCase();
    }

    const deleted = await prisma.submission.deleteMany({
      where: deleteWhere,
    });

    return NextResponse.json({
      success: true,
      message: "Student attempt reset successfully.",
      count: deleted.count,
    });
  } catch (error) {
    console.error("Reset submission error:", error);
    return NextResponse.json({ error: "Failed to reset student attempt" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
  });

  if (!teacher || (!teacher.isApproved && !isAdmin)) {
    return NextResponse.json({ error: "Unauthorized or pending approval" }, { status: 403 });
  }

  const isUserAdmin = isAdmin || teacher.role === "ADMIN";
  const { id: quizId } = await params;

  const quiz = await prisma.quiz.findFirst({
    where: isUserAdmin
      ? { id: quizId }
      : { id: quizId, subject: { teacherId: teacher.id } },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { submissionId, score, status } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, quizId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: score !== undefined ? Math.max(0, Number(score)) : submission.score,
        status: status || submission.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student score updated successfully.",
      submission: updated,
    });
  } catch (error: any) {
    console.error("Update submission score error:", error);
    return NextResponse.json({ error: error.message || "Failed to update submission" }, { status: 500 });
  }
}
