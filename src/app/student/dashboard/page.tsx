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
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "UPCOMING" | "COMPLETED">("ACTIVE");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/student/me");
        if (res.status === 401) {
          router.push("/student/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load student dashboard");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentHeader />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-mono">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-3" />
          <span>Loading assigned courses and active quizzes...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentHeader />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="flat-card p-6 bg-white border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Session Expired</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Please sign in with your student ID number again.
            </p>
            <Link href="/student/login" className="flat-button-primary text-xs py-2.5 px-4 min-h-[44px] flex items-center justify-center">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, enrolledSubjects, activeQuizzes, upcomingQuizzes, completedQuizzes } = data;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StudentHeader
        studentName={student.studentName}
        studentIdNumber={student.studentIdNumber}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Student Assessment Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Enrolled in <span className="font-semibold text-slate-800">{enrolledSubjects.length} subjects</span>. Anti-cheat integrity monitoring active during tests.
            </p>
          </div>

          {/* Enrolled Subjects Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {enrolledSubjects.map((sub: any) => (
              <div
                key={sub.id}
                className="flat-card px-2.5 py-1 text-xs font-mono font-bold bg-white border-slate-300 text-slate-800 flex items-center gap-1.5 shrink-0"
              >
                <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>{sub.subjectCode}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation - Scrollable on mobile */}
        <div className="border-b border-slate-200 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-max">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3.5 sm:px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 sm:gap-2 min-h-[40px] touch-manipulation ${
                activeTab === "ACTIVE"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Active Quizzes</span>
              <span className="w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] flex items-center justify-center font-bold">
                {activeQuizzes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("UPCOMING")}
              className={`px-3.5 sm:px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 sm:gap-2 min-h-[40px] touch-manipulation ${
                activeTab === "UPCOMING"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Upcoming</span>
              <span className="w-5 h-5 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                {upcomingQuizzes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-3.5 sm:px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 sm:gap-2 min-h-[40px] touch-manipulation ${
                activeTab === "COMPLETED"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Completed & Graded</span>
              <span className="w-5 h-5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[10px] flex items-center justify-center font-bold">
                {completedQuizzes.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "ACTIVE" && (
            <div className="space-y-4">
              {activeQuizzes.length === 0 ? (
                <div className="flat-card p-8 sm:p-12 text-center bg-white">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">All caught up!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You have no active pending exams for your enrolled subjects right now.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeQuizzes.map((quiz: any) => (
                    <div
                      key={quiz.id}
                      className="flat-card bg-white p-5 sm:p-6 border-2 border-slate-900 flex flex-col justify-between space-y-4 hover:border-indigo-600 transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flat-badge-indigo font-mono font-bold text-xs">
                            {quiz.subjectCode}
                          </span>
                          <span className="flat-badge-emerald animate-pulse text-[10px] sm:text-xs">
                            OPEN NOW
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {quiz.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {quiz.description || "No description provided."}
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {quiz.durationMinutes}m Duration
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 border border-slate-200">
                            {quiz.totalQuestions} Qs ({quiz.totalPoints} pts)
                          </span>
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-500" /> Max {quiz.maxViolations} Strikes
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-500 font-mono">
                          {quiz.deadlineAt
                            ? `Due: ${new Date(quiz.deadlineAt).toLocaleDateString()}`
                            : "No strict deadline"}
                        </div>

                        <Link
                          href={`/student/quiz/${quiz.id}`}
                          className="flat-button-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation w-full xs:w-auto"
                        >
                          <span>Start Exam</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "UPCOMING" && (
            <div className="space-y-4">
              {upcomingQuizzes.length === 0 ? (
                <div className="flat-card p-8 sm:p-12 text-center bg-white">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">No scheduled upcoming quizzes</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    New assessments posted by your faculty will appear here when scheduled.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingQuizzes.map((quiz: any) => (
                    <div
                      key={quiz.id}
                      className="flat-card bg-white p-5 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flat-badge-slate font-mono font-bold text-xs">
                          {quiz.subjectCode}
                        </span>
                        <span className="flat-badge-amber">UPCOMING</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {quiz.title}
                      </h3>
                      <div className="text-xs text-slate-500">
                        Opens on: {new Date(quiz.startAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "COMPLETED" && (
            <div className="space-y-4">
              {completedQuizzes.length === 0 ? (
                <div className="flat-card p-8 sm:p-12 text-center bg-white">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">No completed tests yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    When you finish an exam, your score and grading breakdown will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedQuizzes.map((quiz: any) => {
                    const sub = quiz.submission;
                    const percentage =
                      sub && quiz.totalPoints > 0
                        ? ((sub.score / quiz.totalPoints) * 100).toFixed(1)
                        : "0.0";

                    return (
                      <div
                        key={quiz.id}
                        className="flat-card p-4 sm:p-5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flat-badge-slate font-mono text-xs">
                              {quiz.subjectCode}
                            </span>
                            <span
                              className={
                                sub?.status === "AUTO_SUBMITTED"
                                  ? "flat-badge-amber text-[10px]"
                                  : "flat-badge-emerald text-[10px]"
                              }
                            >
                              {sub?.status || "COMPLETED"}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {quiz.title}
                          </h3>
                          <div className="text-[11px] text-slate-500">
                            Submitted at:{" "}
                            {sub?.submittedAt
                              ? new Date(sub.submittedAt).toLocaleString()
                              : "Expired"}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                              {sub ? `${sub.score} / ${quiz.totalPoints}` : "0"}
                            </div>
                            <div className="text-xs text-emerald-600 font-bold">
                              {percentage}%
                            </div>
                          </div>

                          {sub?.violationCount > 0 && (
                            <div className="flat-badge-rose text-[10px] sm:text-[11px] font-mono font-bold">
                              {sub.violationCount} Strikes
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; 2026 WebQuiz Academic Exam Engine
      </footer>
    </div>
  );
}
