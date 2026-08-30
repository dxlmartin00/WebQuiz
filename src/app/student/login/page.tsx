"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      {/* Top minimal header */}
      <header className="border-b border-slate-200 bg-white py-3.5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">
              W
            </span>
            <span>WebQuiz Student Portal</span>
          </div>
        </div>
      </header>

      {/* Main card */}
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 my-auto">
        <div className="flat-card p-6 sm:p-8 bg-white border-2 border-slate-900 shadow-xl space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono">
              <UserCheck className="w-4 h-4" />
              <span>Assessment Access</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Student Sign In
            </h1>
            <p className="text-xs text-slate-500">
              Enter your official enrolled Student ID to access your active examinations.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                Must be listed in your professor's class roster.
              </p>
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
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; 2026 Aurora Alliance - Built with Next.js, Prisma, Tailwind CSS &amp; XLSX.
      </footer>
    </div>
  );
}
