import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.user.id;
    const isApproved = (session.user as any).isApproved;

    if (!isApproved) {
      return NextResponse.json({ error: "Pending approval", isApproved: false }, { status: 403 });
    }

    // Run queries in parallel to cut latency in half
    const [subjects, quizzes] = await Promise.all([
      prisma.subject.findMany({
        where: { teacherId },
        select: {
          id: true,
          _count: {
            select: { enrollments: true, quizzes: true },
          },
        },
      }),
      prisma.quiz.findMany({
        where: {
          subject: { teacherId },
        },
        select: {
          id: true,
          title: true,
          description: true,
          durationMinutes: true,
          isPublished: true,
          subject: {
            select: { subjectCode: true },
          },
          questions: {
            select: { points: true },
          },
          submissions: {
            select: {
              status: true,
              violationCount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalEnrollments = subjects.reduce((sum, s) => sum + s._count.enrollments, 0);
    const totalQuizzes = quizzes.length;
    let totalSubmissions = 0;
    let totalViolations = 0;

    const formattedQuizzes = quizzes.map((q) => {
      const totalPoints = q.questions.reduce((sum, item) => sum + item.points, 0);
      let completedCount = 0;
      let qViolations = 0;

      for (const sub of q.submissions) {
        totalSubmissions++;
        totalViolations += sub.violationCount;
        qViolations += sub.violationCount;
        if (sub.status === "SUBMITTED" || sub.status === "AUTO_SUBMITTED") {
          completedCount++;
        }
      }

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        subjectCode: q.subject.subjectCode,
        durationMinutes: q.durationMinutes,
        isPublished: q.isPublished,
        totalQuestions: q.questions.length,
        totalPoints,
        completedCount,
        violations: qViolations,
      };
    });

    return NextResponse.json(
      {
        teacher: {
          id: session.user.id,
          name: session.user.name || "Faculty Member",
          email: session.user.email,
          role: (session.user as any).role || "TEACHER",
          isApproved: true,
        },
        stats: {
          activeClasses: subjects.length,
          totalEnrollments,
          totalQuizzes,
          publishedQuizzes: quizzes.filter((q) => q.isPublished).length,
          totalSubmissions,
          totalViolations,
        },
        quizzes: formattedQuizzes,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
