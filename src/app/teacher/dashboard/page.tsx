"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  FileQuestion,
  Plus,
  ArrowRight,
  Download,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { StatCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/ToastContext";

export default function TeacherDashboardPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/dashboard");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load dashboard");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      console.error("Dashboard error:", e);
      setError(e.message || "Failed to load dashboard data");
      toast.error("Dashboard Error", e.message || "Could not load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const teacher = data?.teacher || {
    name: session?.user?.name || "Faculty Member",
    email: session?.user?.email || "",
    role: (session?.user as any)?.role || "TEACHER",
    isApproved: (session?.user as any)?.isApproved ?? true,
  };

  const stats = data?.stats || {
    activeClasses: 0,
    totalEnrollments: 0,
    totalQuizzes: 0,
    publishedQuizzes: 0,
    totalSubmissions: 0,
    totalViolations: 0,
  };

  const quizzes = data?.quizzes || [];

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Faculty Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{teacher.name}</span> ({teacher.email}). Manage your class sections and live assessments.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="flat-button-secondary text-xs py-1 px-2 flex items-center gap-1 text-rose-700 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Metrics Row (Skeletons when loading) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="flat-card p-4 sm:p-5 border-l-4 border-l-slate-900 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Classes
                </span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {stats.activeClasses}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {stats.totalEnrollments} enrolled student IDs
              </div>
            </div>

            <div className="flat-card p-4 sm:p-5 border-l-4 border-l-indigo-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Quizzes
                </span>
                <FileQuestion className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {stats.totalQuizzes}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {stats.publishedQuizzes} currently published
              </div>
            </div>

            <div className="flat-card p-4 sm:p-5 border-l-4 border-l-emerald-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Student Submissions
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
                {stats.totalSubmissions}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Auto-graded and recorded
              </div>
            </div>

            <div className="flat-card p-4 sm:p-5 border-l-4 border-l-rose-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Integrity Flags
                </span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2 font-mono">
                {stats.totalViolations}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Tab switches & blur infractions
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quizzes Management List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
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

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flat-card p-8 sm:p-12 text-center bg-white border border-slate-200">
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
            {quizzes.map((quiz: any) => (
              <div
                key={quiz.id}
                className="flat-card p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-400 transition-colors shadow-xs"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton text={quiz.subjectCode} />
                    {quiz.isPublished ? (
                      <span className="flat-badge-emerald font-semibold">Published</span>
                    ) : (
                      <span className="flat-badge-amber font-semibold">Draft</span>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {quiz.durationMinutes} mins
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {quiz.totalQuestions} questions ({quiz.totalPoints} pts)
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
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
                      {quiz.completedCount} Submissions
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {quiz.violations > 0 ? (
                        <span className="text-rose-600 font-semibold flex items-center sm:justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" /> {quiz.violations} Flags
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
