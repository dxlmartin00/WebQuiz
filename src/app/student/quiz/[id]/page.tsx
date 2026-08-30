"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentHeader from "@/components/layout/StudentHeader";
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  HelpCircle,
  Award,
  AlertTriangle,
  Lock,
  ArrowRight,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export default function StudentQuizOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function loadQuizInfo() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/quiz/${id}/start`, {
          method: "POST",
        });
        const json = await res.json();

        if (json.isSubmitted) {
          setData({ ...json, alreadySubmitted: true });
          return;
        }

        if (!res.ok) {
          throw new Error(json.error || "Failed to access quiz");
        }

        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadQuizInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentHeader />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-mono">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-3" />
          <span>Verifying enrollment eligibility and initializing secure test session...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentHeader />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="flat-card p-6 bg-white border border-slate-200 space-y-4">
            <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">Access Restricted</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <Link
              href="/student/dashboard"
              className="flat-button-primary text-xs py-2.5 px-4 min-h-[44px] inline-flex items-center justify-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentHeader />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="flat-card p-6 sm:p-8 bg-white border border-slate-200 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Quiz Already Submitted</h2>
            <p className="text-xs text-slate-500">
              You have previously completed this assessment.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 font-mono">
              <div className="text-2xl font-black text-slate-900">
                {data.submission?.score} / {data.submission?.totalPoints} pts
              </div>
              <div className="text-xs text-slate-500 mt-1 uppercase">
                Status: {data.submission?.status}
              </div>
            </div>
            <Link
              href="/student/dashboard"
              className="flat-button-primary text-xs py-2.5 px-4 min-h-[44px] inline-flex items-center justify-center mt-4 w-full"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { quiz } = data;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <StudentHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Exam Information Card */}
        <div className="flat-card border-2 border-slate-900 bg-white p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flat-badge-indigo font-mono text-xs font-bold">
                {quiz.subjectCode}
              </span>
              <span className="text-xs text-slate-500 truncate">{quiz.subjectTitle}</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {quiz.title}
            </h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {quiz.description || "No specific instructions provided."}
            </p>
          </div>

          {/* Test Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3.5 sm:p-4 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Time Limit
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {quiz.durationMinutes} Mins
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Questions
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-0.5 block">
                {quiz.totalQuestions} Items
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Score
              </span>
              <span className="text-xs sm:text-sm font-black text-indigo-600 font-mono mt-0.5 block">
                {quiz.totalPoints} Points
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Strike Limit
              </span>
              <span className="text-xs sm:text-sm font-black text-rose-600 font-mono mt-0.5 block">
                {quiz.maxViolations} Strikes
              </span>
            </div>
          </div>

          {/* Anti-Cheating & Integrity Safeguards Box */}
          <div className="border border-rose-200 bg-rose-50/50 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Mandatory Academic Integrity Safeguards</span>
            </div>

            <ul className="text-xs text-rose-950 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <b>Tab-Switch & Blur Detection:</b> Navigating away from the quiz logs an infraction. Reaching <b>{quiz.maxViolations} strikes</b> auto-submits immediately.
              </li>
              <li>
                <b>Clipboard Protection:</b> Copy, cut, paste, text selection, and right-click menus are disabled.
              </li>
              <li>
                <b>Shortcut Interception:</b> Inspect tools (`F12`, `Ctrl+Shift+I`, `Ctrl+U`) are disabled.
              </li>
              <li>
                <b>Authoritative Server Timer:</b> Elapsed duration is authoritative on the server.
              </li>
            </ul>
          </div>

          {/* Honor Code & Start Button */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded-none shrink-0"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                I understand the anti-cheating rules and confirm that I am taking this examination individually without unauthorized materials or assistance.
              </span>
            </label>

            <button
              onClick={() => router.push(`/student/quiz/${id}/take`)}
              disabled={!agreed}
              className="flat-button-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 min-h-[46px] touch-manipulation"
            >
              <span>Enter Secure Exam Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; 2026 WebQuiz Academic Exam Engine
      </footer>
    </div>
  );
}
