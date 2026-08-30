import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();
    const isAdmin = email === ADMIN_EMAIL || email === "lummartin@nemsu.edu.ph";

    // Self-healing teacher lookup / creation
    let teacher = await prisma.teacher.findUnique({
      where: { email },
    });

    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          email,
          name: session.user.name || "Faculty Member",
          avatar: session.user.image,
          role: isAdmin ? "ADMIN" : "TEACHER",
          isApproved: isAdmin ? true : false,
        },
      });
    }

    if (!teacher.isApproved) {
      return NextResponse.json({ error: "Pending approval", isApproved: false }, { status: 403 });
    }

    // Multi-tenant: Only fetch classes belonging strictly to THIS teacher
    const subjects = await prisma.subject.findMany({
      where: { teacherId: teacher.id },
      include: {
        _count: {
          select: { enrollments: true, quizzes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch quizzes belonging to this teacher
    const quizzes = await prisma.quiz.findMany({
      where: {
        subject: { teacherId: teacher.id },
      },
      include: {
        subject: { select: { subjectCode: true, title: true } },
        questions: { select: { points: true } },
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

    const totalEnrollments = subjects.reduce((sum, s) => sum + s._count.enrollments, 0);
    const totalQuizzes = quizzes.length;
    const totalSubmissions = quizzes.reduce((sum, q) => sum + q.submissions.length, 0);
    const totalViolations = quizzes.reduce(
      (sum, q) => sum + q.submissions.reduce((vSum, sub) => vSum + sub.violationCount, 0),
      0
    );

    const formattedQuizzes = quizzes.map((q) => {
      const totalPoints = q.questions.reduce((sum, item) => sum + item.points, 0);
      const completedCount = q.submissions.filter(
        (s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED"
      ).length;
      const violations = q.submissions.reduce((sum, s) => sum + s.violationCount, 0);

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
        violations,
      };
    });

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        isApproved: teacher.isApproved,
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
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
