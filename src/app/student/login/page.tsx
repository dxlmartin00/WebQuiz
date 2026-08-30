"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, User, AlertCircle } from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base border border-slate-700">
              W
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
              WebQuiz
            </span>
          </Link>

          <Link href="/teacher/login" className="text-xs text-indigo-600 font-bold hover:underline py-1">
            Faculty Sign-In &rarr;
          </Link>
        </div>
      </header>

      <div className="max-w-md w-full mx-auto px-4 py-6 sm:py-12">
        <div className="flat-card border-2 border-slate-900 bg-white p-6 sm:p-8 space-y-5 sm:space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Student Portal Access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your enrolled Student ID Number to access assigned quizzes.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <span>{loading ? "Checking Enrollment..." : "Sign In to Exam Room"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2">
              Quick Demo IDs (Tap to fill):
            </div>
            <div className="flex flex-wrap gap-2">
              {["STU-1001", "STU-1002", "STU-1003", "STU-1004"].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStudentId(id)}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-800 font-mono transition-colors min-h-[36px] touch-manipulation"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; 2026 WebQuiz Student Assessment Platform
      </footer>
    </div>
  );
}
