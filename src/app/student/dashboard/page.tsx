"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentHeader from "@/components/layout/StudentHeader";
import {
  FileQuestion,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Award,
  ShieldAlert,
  Search,
  RefreshCw,
} from "lucide-react";
import { StatCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/ToastContext";

export default function StudentDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "UPCOMING" | "COMPLETED">("ACTIVE");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/me");
      if (res.status === 401) {
        router.push("/student/login");
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load student dashboard");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
      toast.error("Dashboard Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const student = data?.student || { studentIdNumber: "", studentName: "" };
  const subjects = data?.enrolledSubjects || data?.subjects || [];
  const activeQuizzes = data?.activeQuizzes || [];
  const upcomingQuizzes = data?.upcomingQuizzes || [];
  const completedQuizzes = data?.completedQuizzes || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StudentHeader studentName={student.studentName || student.name} studentIdNumber={student.studentIdNumber} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Card */}
        <div className="flat-card p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flat-badge-indigo text-[11px] font-mono">
                Student Portal
              </span>
              <CopyButton text={student.studentIdNumber} className="bg-slate-800 text-slate-300 border-slate-700" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Welcome, {student.studentName || student.name || "Student"}
            </h1>
            <p className="text-xs text-slate-400">
              Enrolled in {subjects.length} class {subjects.length === 1 ? "section" : "sections"}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div className="flat-card p-4 sm:p-5 border-l-4 border-l-indigo-600 bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Quizzes
                </span>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2 font-mono">
                  {activeQuizzes.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  Ready to take right now
                </div>
              </div>

              <div className="flat-card p-4 sm:p-5 border-l-4 border-l-emerald-600 bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Completed Exams
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 font-mono">
                  {completedQuizzes.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  Auto-graded & recorded
                </div>
              </div>

              <div className="flat-card p-4 sm:p-5 border-l-4 border-l-amber-600 bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Enrolled Classes
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 font-mono">
                  {subjects.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  Authorized by faculty
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === "ACTIVE"
                  ? "border-indigo-600 text-indigo-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Active Quizzes ({activeQuizzes.length})
            </button>
            <button
              onClick={() => setActiveTab("UPCOMING")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === "UPCOMING"
                  ? "border-indigo-600 text-indigo-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Upcoming ({upcomingQuizzes.length})
            </button>
            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === "COMPLETED"
                  ? "border-indigo-600 text-indigo-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Submission History ({completedQuizzes.length})
            </button>
          </div>

          {/* Tab Content with Skeletons */}
          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : activeTab === "ACTIVE" ? (
            activeQuizzes.length === 0 ? (
              <div className="flat-card p-12 text-center bg-white border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">All caught up!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You have no pending quizzes or examinations at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeQuizzes.map((q: any) => (
                  <div
                    key={q.id}
                    className="flat-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-400 transition-colors shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CopyButton text={q.subjectCode} />
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {q.durationMinutes} minutes
                        </span>
                        <span className="text-xs text-slate-500">
                          {q.totalQuestions} Questions ({q.totalPoints} pts)
                        </span>
                      </div>
                      <h2 className="font-bold text-slate-900 text-base">
                        {q.title}
                      </h2>
                      <p className="text-xs text-slate-500 truncate max-w-2xl">
                        {q.description || `${q.subjectTitle} Assessment`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                      <Link
                        href={`/student/quiz/${q.id}`}
                        className="flat-button-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
                      >
                        <span>Start Assessment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "UPCOMING" ? (
            upcomingQuizzes.length === 0 ? (
              <div className="flat-card p-12 text-center bg-white border border-slate-200">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">No scheduled upcoming quizzes</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Quizzes scheduled for future dates will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {upcomingQuizzes.map((q: any) => (
                  <div
                    key={q.id}
                    className="flat-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CopyButton text={q.subjectCode} />
                        <span className="flat-badge-amber text-[11px]">Scheduled</span>
                      </div>
                      <h2 className="font-bold text-slate-900 text-base">{q.title}</h2>
                      <p className="text-xs text-slate-500">
                        Opens on: <span className="font-semibold text-slate-700">{new Date(q.startAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            completedQuizzes.length === 0 ? (
              <div className="flat-card p-12 text-center bg-white border border-slate-200">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">No submission records yet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Completed quizzes and recorded scores will be listed here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {completedQuizzes.map((q: any) => {
                  const s = q.submission;
                  return (
                    <div
                      key={q.id}
                      className="flat-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flat-badge-emerald text-[11px] font-bold">COMPLETED</span>
                          {s?.submittedAt && (
                            <span className="text-xs text-slate-400 font-mono">
                              Submitted on {new Date(s.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h2 className="font-bold text-slate-900 text-base">
                          {q.title}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>Subject: <strong className="text-slate-700">{q.subjectCode}</strong></span>
                          {s?.violationCount > 0 && (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> {s.violationCount} Integrity Flags
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-xs text-slate-500 font-semibold">FINAL SCORE</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">
                          {s?.score ?? 0} <span className="text-sm font-normal text-slate-400">/ {s?.totalPoints ?? q.totalPoints}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
