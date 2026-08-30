import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStudentSession();

  if (!session?.studentIdNumber) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentIdNumber } = session;

  // Fetch student enrollments and subject details
  const enrollments = await prisma.enrollment.findMany({
    where: { studentIdNumber },
    include: {
      subject: {
        include: {
          quizzes: {
            where: { isPublished: true },
            include: {
              questions: {
                select: { id: true, points: true },
              },
              submissions: {
                where: { studentIdNumber },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const now = new Date();
  const enrolledSubjects = enrollments.map((e) => ({
    id: e.subject.id,
    subjectCode: e.subject.subjectCode,
    title: e.subject.title,
    description: e.subject.description,
  }));

  const activeQuizzes: any[] = [];
  const upcomingQuizzes: any[] = [];
  const completedQuizzes: any[] = [];

  for (const enrollment of enrollments) {
    for (const quiz of enrollment.subject.quizzes) {
      const submission = quiz.submissions[0] || null;
      const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const isPastDeadline = quiz.deadlineAt ? new Date(quiz.deadlineAt) < now : false;
      const isFutureStart = quiz.startAt ? new Date(quiz.startAt) > now : false;

      const quizData = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        subjectId: enrollment.subject.id,
        subjectCode: enrollment.subject.subjectCode,
        subjectTitle: enrollment.subject.title,
        durationMinutes: quiz.durationMinutes,
        maxViolations: quiz.maxViolations,
        totalQuestions: quiz.questions.length,
        totalPoints,
        startAt: quiz.startAt,
        deadlineAt: quiz.deadlineAt,
        submission: submission
          ? {
              id: submission.id,
              score: submission.score,
              totalPoints: submission.totalPoints,
              status: submission.status,
              violationCount: submission.violationCount,
              startedAt: submission.startedAt,
              submittedAt: submission.submittedAt,
            }
          : null,
      };

      if (submission && (submission.status === "SUBMITTED" || submission.status === "AUTO_SUBMITTED" || submission.status === "DISQUALIFIED")) {
        completedQuizzes.push(quizData);
      } else if (isFutureStart) {
        upcomingQuizzes.push(quizData);
      } else if (isPastDeadline) {
        // Expired without submission
        completedQuizzes.push({
          ...quizData,
          expiredWithoutSubmission: !submission,
        });
      } else {
        // Active (can be in progress or not started yet)
        activeQuizzes.push(quizData);
      }
    }
  }

  return NextResponse.json(
    {
      student: {
        studentIdNumber: session.studentIdNumber,
        studentName: session.studentName,
      },
      subjects: enrolledSubjects,
      enrolledSubjects,
      activeQuizzes,
      upcomingQuizzes,
      completedQuizzes,
    },
    {
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" },
    }
  );
}
