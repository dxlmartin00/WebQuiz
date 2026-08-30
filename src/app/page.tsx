"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Zap,
  Lock,
  ArrowRight,
  UserCheck,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIdNumber: studentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      router.push("/student/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base border border-slate-700">
              W
            </div>
            <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg">
              WebQuiz
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200">
              Academic v1.0
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/teacher/login"
              className="flat-button-secondary text-xs py-2 px-3 sm:px-4 font-semibold min-h-[38px] flex items-center justify-center"
            >
              Faculty Portal &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Col: Platform Description */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEMSU Academic Online Examination System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Seamless Quizzes, Instant Automated Grading & Anti-Cheating.
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            WebQuiz provides professors and faculty with automated grading, student roster verification, Excel gradebook export, and real-time focus tracking safeguards.
          </p>

          {/* Value Props Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
            <div className="flat-card p-3 sm:p-4 bg-white border-l-4 border-l-indigo-600">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Anti-Cheating Tracking</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Monitors blur events and tab switches with auto-submission limits.
              </p>
            </div>

            <div className="flat-card p-3 sm:p-4 bg-white border-l-4 border-l-emerald-600">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Auto-Grading</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multiple choice, multiple answer, and fuzzy text matching.
              </p>
            </div>

            <div className="flat-card p-3 sm:p-4 bg-white border-l-4 border-l-amber-600">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Excel Class List Importer</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Directly import official NEMSU student rosters from XLSX/CSV.
              </p>
            </div>

            <div className="flat-card p-3 sm:p-4 bg-white border-l-4 border-l-slate-900">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-slate-900 shrink-0" />
                <span>Roster Access Gate</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Only enrolled student IDs can start designated quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Student Portal Quick Access Card */}
        <div className="lg:col-span-5 w-full">
          <div className="flat-card p-5 sm:p-7 bg-white border-2 border-slate-900 shadow-xl space-y-4 sm:space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono mb-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Student Portal</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Enter Exam Room
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your enrolled student ID number to view and start your quizzes.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2023-10492"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="flat-input font-mono text-sm py-2.5 sm:py-3 w-full"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be registered in your professor's class roster.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !studentId.trim()}
                className="flat-button-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 min-h-[46px] touch-manipulation"
              >
                <span>{loading ? "Verifying Roster..." : "Access Enrolled Quizzes"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Faculty Switch Link */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-500">Are you a faculty instructor? </span>
              <Link
                href="/teacher/login"
                className="text-xs font-bold text-indigo-600 hover:underline py-1 inline-block"
              >
                Sign in to Teacher Admin &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Flat Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-slate-500">
          <div className="text-center sm:text-left">
            &copy; 2026 Aurora Alliance - Built with Next.js, Prisma, Tailwind CSS &amp; XLSX.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Systems Online
            </span>
            <Link href="/teacher/login" className="hover:text-slate-900 underline py-1">
              Faculty Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
