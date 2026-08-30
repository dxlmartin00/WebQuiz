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

  const handleDemoStudent = (id: string) => {
    setStudentId(id);
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
            <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
              WebQuiz
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/teacher/login"
              className="flat-button-secondary text-xs sm:text-sm py-1.5 sm:py-2 px-2.5 sm:px-3.5 flex items-center gap-1.5 min-h-[36px] touch-manipulation"
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
              <span>Teacher Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Mission & Features */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
            <span>Authoritative & Secure Examination Engine</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Precision Quiz Management, Automated Grading & Anti-Cheat.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
            Engineered for academic rigor. Features Levenshtein fuzzy short-answer evaluation, server-authoritative timekeeping, real-time tab-blur strike tracking, and instant Excel gradebook export.
          </p>

          {/* Key Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4">
            <div className="flat-card p-3.5 sm:p-4 border-l-4 border-l-indigo-600 bg-white">
              <Zap className="w-5 h-5 text-indigo-600 mb-1.5" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Automated Grading</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Fuzzy answer matching, synonym normalization & instant scoring.
              </p>
            </div>

            <div className="flat-card p-3.5 sm:p-4 border-l-4 border-l-rose-600 bg-white">
              <Lock className="w-5 h-5 text-rose-600 mb-1.5" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Anti-Cheat Lockdown</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Tab-switch detection, clipboard lockouts & shortcut intercepts.
              </p>
            </div>

            <div className="flat-card p-3.5 sm:p-4 border-l-4 border-l-emerald-600 bg-white">
              <Award className="w-5 h-5 text-emerald-600 mb-1.5" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1-Click XLSX Export</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Comprehensive gradebooks, item analysis & cheating audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Student Fast Entry Portal */}
        <div className="lg:col-span-5">
          <div className="flat-card border-2 border-slate-900 bg-white p-5 sm:p-8">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Student Portal Access
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your enrolled Student ID Number to enter.
                </p>
              </div>
              <div className="w-8 h-8 bg-slate-100 border border-slate-300 flex items-center justify-center font-mono text-xs font-bold text-slate-700 shrink-0">
                ID
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Student ID Number
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-1001"
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck="false"
                  className="flat-input font-mono text-base py-3 min-h-[46px]"
                />
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

            {/* Quick Demo Student Picker */}
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">
                Quick Demo Enrolled Students (Tap to fill):
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  { id: "STU-1001", name: "Alice J." },
                  { id: "STU-1002", name: "Bob S." },
                  { id: "STU-1003", name: "Charlie D." },
                ].map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleDemoStudent(demo.id)}
                    className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-800 font-mono transition-colors min-h-[36px] touch-manipulation"
                  >
                    {demo.id} ({demo.name})
                  </button>
                ))}
              </div>
            </div>

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
            &copy; 2026 WebQuiz Systems Inc. Built with Next.js, Prisma, Tailwind CSS & XLSX.
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
