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
import { CardSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/ToastContext";

export default function StudentDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "UPCOMING" | "COMPLETED">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");

  function getDeadlineStatus(deadlineAt?: string | null) {
    if (!deadlineAt) return null;
    const now = new Date();
    const deadline = new Date(deadlineAt);
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { label: "Deadline passed", isUrgent: true, isExpired: true };
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 3) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return { label: `Closes in ${diffMins}m!`, isUrgent: true, isExpired: false };
    }
    if (diffHours < 24) {
      return { label: `Closes in ${diffHours}h`, isUrgent: true, isExpired: false };
    }
    if (diffDays === 1) {
      return { label: `Closes tomorrow`, isUrgent: false, isExpired: false };
    }
    return {
      label: `Due ${deadline.toLocaleDateString([], { month: "short", day: "numeric" })}`,
      isUrgent: false,
      isExpired: false,
    };
  }

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
  const rawActiveQuizzes = data?.activeQuizzes || [];
  const rawUpcomingQuizzes = data?.upcomingQuizzes || [];
  const rawCompletedQuizzes = data?.completedQuizzes || [];

  const filterItem = (q: any) => {
    if (!searchQuery.trim()) return true;
    const qTerm = searchQuery.toLowerCase();
    return (
      q.title?.toLowerCase().includes(qTerm) ||
      q.subjectCode?.toLowerCase().includes(qTerm) ||
      q.subjectTitle?.toLowerCase().includes(qTerm) ||
      q.description?.toLowerCase().includes(qTerm)
    );
  };

  const activeQuizzes = rawActiveQuizzes.filter(filterItem);
  const upcomingQuizzes = rawUpcomingQuizzes.filter(filterItem);
  const completedQuizzes = rawCompletedQuizzes.filter(filterItem);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StudentHeader studentName={student.studentName || student.name} studentIdNumber={student.studentIdNumber} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Card with Integrated Metrics */}
        <div className="flat-card bg-slate-900 text-white border-2 border-slate-900 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flat-badge-indigo text-[10px] sm:text-[11px] font-mono">
                  Student Portal
                </span>
                <CopyButton text={student.studentIdNumber} className="bg-slate-800 text-slate-300 border-slate-700 text-xs" />
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                Welcome, {student.studentName || student.name || "Student"}
              </h1>
              <p className="text-xs text-slate-400">
                Enrolled in {subjects.length} class {subjects.length === 1 ? "section" : "sections"}.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={loadData}
                className="px-3 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Compact Informational Status Bar */}
          <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 bg-slate-950/70 text-slate-300 select-none">
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`p-2.5 sm:py-3 sm:px-5 text-center sm:text-left transition-colors flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5 group cursor-pointer ${
                activeTab === "ACTIVE" ? "bg-indigo-950/50" : "hover:bg-slate-900/60"
              }`}
              title="View Active Quizzes"
            >
              <span className="text-lg sm:text-2xl font-black font-mono text-indigo-400 leading-tight">
                {loading ? "--" : activeQuizzes.length}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 group-hover:text-slate-200 font-bold uppercase tracking-wider">
                Active <span className="hidden sm:inline">Quizzes</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("COMPLETED")}
              className={`p-2.5 sm:py-3 sm:px-5 text-center sm:text-left transition-colors flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5 group cursor-pointer ${
                activeTab === "COMPLETED" ? "bg-emerald-950/50" : "hover:bg-slate-900/60"
              }`}
              title="View Completed Exams"
            >
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-400 leading-tight">
                {loading ? "--" : completedQuizzes.filter((q: any) => !q.expiredWithoutSubmission).length}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 group-hover:text-slate-200 font-bold uppercase tracking-wider">
                Completed <span className="hidden sm:inline">Exams</span>
              </span>
            </button>

            <div className="p-2.5 sm:py-3 sm:px-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
              <span className="text-lg sm:text-2xl font-black font-mono text-amber-400 leading-tight">
                {loading ? "--" : subjects.length}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                Enrolled <span className="hidden sm:inline">Classes</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation and Search Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab("ACTIVE")}
                className={`pb-2.5 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === "ACTIVE"
                    ? "border-indigo-600 text-indigo-600 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Active Quizzes ({activeQuizzes.length})
              </button>
              <button
                onClick={() => setActiveTab("UPCOMING")}
                className={`pb-2.5 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === "UPCOMING"
                    ? "border-indigo-600 text-indigo-600 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Upcoming ({upcomingQuizzes.length})
              </button>
              <button
                onClick={() => setActiveTab("COMPLETED")}
                className={`pb-2.5 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === "COMPLETED"
                    ? "border-indigo-600 text-indigo-600 font-black"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="sm:hidden">History ({completedQuizzes.length})</span>
                <span className="hidden sm:inline">Submission History ({completedQuizzes.length})</span>
              </button>
            </div>

            {/* Quick Search Bar */}
            <div className="pb-2 sm:pb-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by title or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flat-input text-xs pl-8 py-1.5 w-full sm:w-56"
                />
              </div>
            </div>
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
                <h3 className="font-bold text-slate-900 text-sm">
                  {searchQuery ? "No matching quizzes found" : "All caught up!"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? "Try clearing your search term."
                    : "You have no pending quizzes or examinations at this time."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeQuizzes.map((q: any) => {
                  const deadlineInfo = getDeadlineStatus(q.deadlineAt);

                  return (
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

                          {deadlineInfo && (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 border flex items-center gap-1 ${
                                deadlineInfo.isUrgent
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{deadlineInfo.label}</span>
                            </span>
                          )}
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
                );
              })}
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
                  const isExpired = !!q.expiredWithoutSubmission;

                  return (
                    <div
                      key={q.id}
                      className="flat-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {isExpired ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              MISSED / DEADLINE PASSED
                            </span>
                          ) : (
                            <span className="flat-badge-emerald text-[11px] font-bold">COMPLETED</span>
                          )}
                          {s?.submittedAt && (
                            <span className="text-xs text-slate-400 font-mono">
                              Submitted on {new Date(s.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                          {isExpired && q.deadlineAt && (
                            <span className="text-xs text-slate-400 font-mono">
                              Closed on {new Date(q.deadlineAt).toLocaleString()}
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
                        {isExpired ? (
                          <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1.5 border border-rose-200">
                            No submission recorded
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-slate-500 font-semibold">FINAL SCORE</div>
                            <div className="text-2xl font-black text-slate-900 font-mono">
                              {s?.score ?? 0} <span className="text-sm font-normal text-slate-400">/ {s?.totalPoints ?? q.totalPoints}</span>
                            </div>
                          </>
                        )}
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
