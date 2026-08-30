import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  FileQuestion,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Download,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/teacher/login");
  }

  let teacher = await prisma.teacher.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  // Self-healing: Ensure teacher record exists in DB if session is valid
  if (!teacher) {
    const email = session.user.email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();
    const isAdmin = email === adminEmail || email === "lummartin@nemsu.edu.ph";

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
    redirect("/teacher/pending-approval");
  }

  // Multi-tenant: Only fetch classes belonging strictly to THIS teacher
  const subjects = await prisma.subject.findMany({
    where: { teacherId: teacher.id },
    include: {
      _count: {
        select: { enrollments: true, quizzes: true },
      },
    },
  });

  // Fetch quizzes with submissions and violations
  const quizzes = await prisma.quiz.findMany({
    where: {
      subject: { teacherId: teacher.id },
    },
    include: {
      subject: true,
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

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {teacher.role === "ADMIN" ? (
              <span className="flat-badge-amber font-mono text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Developer Administrator</span>
              </span>
            ) : (
              <span className="flat-badge-indigo font-mono text-xs font-bold">
                Faculty Member
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Faculty Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{teacher.name}</span> ({teacher.email}). Manage your own class sections and live assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teacher/subjects"
            className="flat-button-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manage Classes</span>
          </Link>
          <Link
            href="/teacher/quizzes/new"
            className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Quiz</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flat-card p-5 border-l-4 border-l-slate-900 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              My Active Classes
            </span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {subjects.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {totalEnrollments} enrolled student IDs
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-indigo-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              My Total Quizzes
            </span>
            <FileQuestion className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {totalQuizzes}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {quizzes.filter((q) => q.isPublished).length} currently published
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-emerald-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Student Submissions
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {totalSubmissions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Auto-graded and recorded
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-rose-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Integrity Flags
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2 font-mono">
            {totalViolations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Tab switches & blur infractions
          </div>
        </div>
      </div>

      {/* Quizzes Management List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              My Active Quizzes & Assessments
            </h2>
            <p className="text-xs text-slate-500">
              Click any quiz to inspect the live gradebook, download Excel reports, or adjust answer keys.
            </p>
          </div>
          <Link
            href="/teacher/quizzes"
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            View All ({quizzes.length}) &rarr;
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <div className="flat-card p-12 text-center bg-white border border-slate-200">
            <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-sm">No quizzes yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first subject and build an interactive quiz with automated grading.
            </p>
            <Link
              href="/teacher/quizzes/new"
              className="flat-button-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Quiz</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {quizzes.map((quiz) => {
              const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
              const completedCount = quiz.submissions.filter(
                (s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED"
              ).length;
              const violations = quiz.submissions.reduce((sum, s) => sum + s.violationCount, 0);

              return (
                <div
                  key={quiz.id}
                  className="flat-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-400 transition-colors shadow-xs"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flat-badge-slate font-mono font-bold">
                        {quiz.subject.subjectCode}
                      </span>
                      {quiz.isPublished ? (
                        <span className="flat-badge-emerald font-semibold">Published</span>
                      ) : (
                        <span className="flat-badge-amber font-semibold">Draft</span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {quiz.durationMinutes} mins
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {quiz.questions.length} questions ({totalPoints} pts)
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-2xl">
                      {quiz.description || "No description provided."}
                    </p>
                  </div>

                  {/* Submission and Flag Stats */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {completedCount} Submissions
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {violations > 0 ? (
                          <span className="text-rose-600 font-semibold flex items-center sm:justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" /> {violations} Flags
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">0 Violations</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/quizzes/${quiz.id}/gradebook`}
                        className="flat-button-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
                      >
                        <span>Gradebook</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      <a
                        href={`/api/teacher/quizzes/${quiz.id}/export`}
                        download
                        className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-slate-700 font-semibold"
                        title="Download XLSX Gradebook"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline font-mono">XLSX</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
