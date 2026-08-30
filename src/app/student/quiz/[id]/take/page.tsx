"use client";

import React, { useState, useEffect, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Grid,
} from "lucide-react";

export default function ActiveExamRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Core quiz state
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Authoritative Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const timerInitializedRef = useRef(false);

  // Anti-Cheating Violation state
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");
  
  // Cooldown and Lockout Refs to prevent duplicate multiple strikes
  const isSubmittingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/quiz/${id}/start`, {
          method: "POST",
        });
        const json = await res.json();

        if (json.isSubmitted) {
          router.push(`/student/quiz/${id}`);
          return;
        }

        if (!res.ok) {
          throw new Error(json.error || "Failed to launch exam");
        }

        setData(json);
        const durationSecs = Math.max(10, json.remainingSeconds || json.quiz.durationMinutes * 60);
        setSecondsRemaining(durationSecs);
        timerInitializedRef.current = true;
        setViolationCount(json.submission?.violationCount || 0);
        setMaxViolations(json.quiz.maxViolations || 3);
        if (json.savedAnswers) {
          setAnswers(json.savedAnswers);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [id, router]);

  // Submit Handler
  const handleSubmitQuiz = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      try {
        const res = await fetch(`/api/student/quiz/${id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            isAutoSubmit,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to submit quiz");
        }

        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
        try {
          localStorage.removeItem(`webquiz_answers_${id}`);
        } catch {}

        setResult(json);
      } catch (e: any) {
        console.error("Submission failed:", e);
        alert("Error submitting exam: " + (e.message || "Network issue"));
      } finally {
        setSubmitting(false);
      }
    },
    [answers, id]
  );

  // Countdown Timer - Only runs when initialized with positive seconds
  useEffect(() => {
    if (loading || !data || result || secondsRemaining === null || !timerInitializedRef.current) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true); // Auto-submit ONLY when live countdown reaches zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, data, result, secondsRemaining, handleSubmitQuiz]);

  // Log Violation Helper with Cooldown Guard
  const recordViolation = useCallback(
    async (eventType: string, details: string) => {
      const now = Date.now();
      
      // Strict Guards: Ignore if already submitting, result shown, modal open, or within 6-second cooldown
      if (
        result ||
        isSubmittingRef.current ||
        isModalOpenRef.current ||
        now - lastViolationTimeRef.current < 6000
      ) {
        return;
      }

      lastViolationTimeRef.current = now;

      try {
        const res = await fetch(`/api/student/quiz/${id}/violation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, details }),
        });

        const json = await res.json();
        if (json.success) {
          setViolationCount(json.violationCount);
          setViolationMessage(
            `Strike logged: ${details} (${json.violationCount}/${json.maxViolations} strikes)`
          );
          isModalOpenRef.current = true;
          setViolationModalOpen(true);

          if (json.shouldAutoSubmit) {
            setTimeout(() => {
              handleSubmitQuiz(true);
            }, 1500);
          }
        }
      } catch (e) {
        console.error("Error reporting violation:", e);
      }
    },
    [id, result, handleSubmitQuiz]
  );

  // Anti-Cheating Event Listeners with Deduplication
  useEffect(() => {
    if (loading || !data || result) return;

    // 1. Visibility Change Listener (Tab switch / minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("TAB_SWITCH", "Navigated away from active quiz tab");
      }
    };

    // 2. Window Blur Listener - Only fires if document wasn't hidden (prevents double-counting with visibilitychange)
    const handleWindowBlur = () => {
      if (!document.hidden && !isModalOpenRef.current) {
        recordViolation("WINDOW_BLUR", "Browser window lost focus");
      }
    };

    // 3. Keyboard Shortcut Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault();
        recordViolation("DEVTOOLS_ATTEMPT", `Developer tools hotkey (${e.key}) intercepted`);
      }
    };

    // 4. Clipboard & Context Menu Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("CLIPBOARD_ATTEMPT", "Copy attempt blocked");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("CLIPBOARD_ATTEMPT", "Paste attempt blocked");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [loading, data, result, recordViolation]);

  // Debounced Autosave on Answer change (minimizes serverless compute invocations)
  const handleAnswerChange = (questionId: string, value: string) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    // Instant local caching for zero-data-loss protection
    try {
      localStorage.setItem(`webquiz_answers_${id}`, JSON.stringify(updated));
    } catch {}

    // Debounce serverless network call
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      fetch(`/api/student/quiz/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { [questionId]: value } }),
      }).catch((e) => console.error("Autosave draft error:", e));
    }, 1200);
  };

  // Close Warning Modal & reset modal ref with grace buffer
  const handleDismissModal = () => {
    setViolationModalOpen(false);
    // Give 1.5s grace buffer after closing modal before allowing any new blur detections
    setTimeout(() => {
      isModalOpenRef.current = false;
      lastViolationTimeRef.current = Date.now();
    }, 1500);
  };

  // Format time mm:ss
  const formatTime = (secs: number | null) => {
    if (secs === null) return "--:--";
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center font-mono space-y-3 text-xs text-slate-300">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
          <span>INITIALIZING AUTHORITATIVE EXAM ROOM...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="flat-card bg-slate-950 border border-rose-600 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Exam Session Error</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <Link href="/student/dashboard" className="flat-button-primary text-xs py-2.5 px-4 min-h-[44px] inline-flex items-center justify-center">
            Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  // Submitted / Finished Result Screen
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                W
              </div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">WebQuiz Exam Submission</span>
            </div>
            <Link href="/student/dashboard" className="flat-button-primary text-xs py-1.5 px-3">
              Dashboard &rarr;
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-8 sm:py-12 space-y-6">
          <div className="flat-card border-2 border-slate-900 bg-white p-6 sm:p-8 space-y-6 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div>
              <span className="flat-badge-slate font-mono text-xs font-bold mb-2">
                {result.status}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Exam Successfully Completed
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Your responses were graded using the automated grading engine.
              </p>
            </div>

            {/* Score Box */}
            <div className="bg-slate-50 border border-slate-200 p-5 sm:p-6 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Final Calculated Score
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                {result.score} <span className="text-base sm:text-lg text-slate-400">/ {result.totalPoints}</span>
              </div>
              <div className="text-sm font-bold text-emerald-600">
                {result.percentage.toFixed(1)}% Grade
              </div>
            </div>

            {/* Infraction Summary */}
            <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2">
              <span>Recorded Violations: <b className="text-slate-800">{result.violationCount} Strikes</b></span>
              <span className="hidden sm:inline">&bull;</span>
              <span>Submitted: <b className="text-slate-800">{new Date(result.submittedAt).toLocaleTimeString()}</b></span>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/student/dashboard"
                className="flat-button-primary w-full py-3 text-xs sm:text-sm font-bold min-h-[46px] flex items-center justify-center"
              >
                Return to Student Portal
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          &copy; 2026 WebQuiz Academic Exam Engine
        </footer>
      </div>
    );
  }

  const { quiz, questions } = data;
  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;
  const isTimeCritical = secondsRemaining !== null && secondsRemaining <= 120; // 2 mins remaining

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none exam-lockdown">
      {/* Sticky High-Integrity Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Left: Subject Code & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-indigo-600 text-white font-mono font-bold text-[11px] sm:text-xs px-2 py-0.5 border border-indigo-400 shrink-0">
              {quiz.subjectCode}
            </span>
            <span className="font-bold text-xs sm:text-sm text-slate-100 hidden md:inline truncate max-w-[180px] lg:max-w-xs">
              {quiz.title}
            </span>
          </div>

          {/* Center: Authoritative Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 font-mono text-xs sm:text-sm font-black border shrink-0 ${
              isTimeCritical
                ? "bg-rose-950/90 border-rose-500 text-rose-400 animate-pulse"
                : "bg-slate-800 border-slate-700 text-white"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeCritical ? "text-rose-400" : "text-indigo-400"} shrink-0`} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Right: Anti-Cheating Strikes & Submit Action */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-mono font-bold border ${
                violationCount > 0
                  ? "bg-rose-950 text-rose-300 border-rose-700"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
              title="Anti-Cheating Tab Switch Strikes"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {violationCount}/{maxViolations} Strikes
              </span>
            </div>

            <button
              onClick={() => {
                if (confirm("Are you sure you want to finish and submit your exam answers?")) {
                  handleSubmitQuiz(false);
                }
              }}
              disabled={submitting}
              className="flat-button-primary text-[11px] sm:text-xs py-1.5 px-2.5 sm:px-3 bg-emerald-600 border-emerald-500 hover:bg-emerald-700 flex items-center gap-1 font-bold min-h-[34px] touch-manipulation"
            >
              <Send className="w-3 h-3 shrink-0" />
              <span className="hidden xs:inline">{submitting ? "Grading..." : "Submit"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick-Jump Horizontal Question Bar */}
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/80 px-3 py-1.5 overflow-x-auto -webkit-overflow-scrolling-touch">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Grid className="w-3 h-3" /> Q:
            </span>
            {questions.map((q: any, idx: number) => {
              const isAnswered = !!answers[q.id]?.trim();
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-7 h-7 text-[11px] font-mono font-bold border transition-colors flex items-center justify-center shrink-0 touch-manipulation ${
                    isCurrent
                      ? "bg-indigo-600 text-white border-indigo-400 ring-1 ring-white"
                      : isAnswered
                      ? "bg-emerald-900/60 text-emerald-300 border-emerald-700"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Exam Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
        {/* Left Column: Active Question */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          <div className="flat-card bg-white p-5 sm:p-8 border border-slate-300 space-y-5 sm:space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  Q{currentIdx + 1}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  of {questions.length} Items
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flat-badge-slate font-bold uppercase text-[9px] sm:text-[10px]">
                  {currentQuestion.type.replace("_", " ")}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5">
                  {currentQuestion.points} {currentQuestion.points === 1 ? "pt" : "pts"}
                </span>
              </div>
            </div>

            {/* Prompt Statement */}
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQuestion.prompt}
            </div>

            {/* Choices / Input Area */}
            <div className="pt-1">
              {currentQuestion.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2.5">
                  {currentQuestion.options?.map((option: string, optIdx: number) => {
                    const isSelected = answers[currentQuestion.id] === option;
                    return (
                      <label
                        key={optIdx}
                        onClick={() => handleAnswerChange(currentQuestion.id, option)}
                        className={`flex items-center gap-3 p-3.5 sm:p-4 border cursor-pointer transition-all min-h-[48px] touch-manipulation ${
                          isSelected
                            ? "bg-indigo-50/90 border-indigo-600 text-indigo-950 font-semibold"
                            : "bg-white border-slate-300 hover:border-slate-400 active:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600 border-slate-300 shrink-0"
                        />
                        <span className="text-xs sm:text-sm leading-snug">{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "TRUE_FALSE" && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {["True", "False"].map((choice) => {
                    const isSelected = answers[currentQuestion.id] === choice;
                    return (
                      <label
                        key={choice}
                        onClick={() => handleAnswerChange(currentQuestion.id, choice)}
                        className={`p-4 sm:p-5 border text-center font-bold text-sm cursor-pointer transition-all min-h-[52px] flex items-center justify-center touch-manipulation ${
                          isSelected
                            ? "bg-indigo-50/90 border-indigo-600 text-indigo-950"
                            : "bg-white border-slate-300 hover:border-slate-400 active:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q_${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        <span>{choice}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "SHORT_ANSWER" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Your Identification / Short Answer:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="flat-input text-sm sm:text-base font-medium py-3 min-h-[46px]"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Auto-saves on input. Evaluated server-side upon submit.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-5 sm:pt-6 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flat-button-secondary text-xs py-2.5 px-3 sm:px-3.5 flex items-center gap-1 min-h-[42px] touch-manipulation disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="text-xs font-mono text-slate-500 text-center">
                {answeredCount}/{questions.length} <span className="hidden xs:inline">Answered</span>
              </div>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flat-button-primary text-xs py-2.5 px-3.5 sm:px-4 flex items-center gap-1 min-h-[42px] touch-manipulation font-bold"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you ready to submit all answers for grading?")) {
                      handleSubmitQuiz(false);
                    }
                  }}
                  disabled={submitting}
                  className="flat-button-primary text-xs py-2.5 px-4 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 font-bold flex items-center gap-1.5 min-h-[42px] touch-manipulation"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Jump Navigator & Integrity Box (Desktop View) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          {/* Question Jump Grid */}
          <div className="flat-card bg-white p-5 border border-slate-300 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-200">
              Question Navigator ({answeredCount}/{questions.length})
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, idx: number) => {
                const isAnswered = !!answers[q.id]?.trim();
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-10 text-xs font-mono font-bold border transition-colors flex items-center justify-center ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-indigo-600 ring-offset-1"
                        : isAnswered
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 inline-block" />
                Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-white border border-slate-300 inline-block" />
                Unanswered
              </span>
            </div>
          </div>

          {/* Integrity Monitoring Badge */}
          <div className="flat-card bg-slate-900 text-white p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Anti-Cheat Guard Active</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Window focus, tab visibility, clipboard access, and hotkeys are authoritatively monitored.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 font-mono text-xs text-rose-400 flex items-center justify-between">
              <span>STRIKES ACCUMULATED:</span>
              <span className="font-bold text-sm">
                {violationCount} / {maxViolations}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Full-screen Warning Modal on Infraction */}
      {violationModalOpen && (
        <div className="fixed inset-0 z-50 bg-rose-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="flat-card border-2 border-rose-600 bg-white max-w-[95vw] sm:max-w-md w-full p-5 sm:p-6 text-center space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-rose-950 uppercase tracking-tight">
                Academic Integrity Violation
              </h3>
              <p className="text-xs text-rose-800 mt-2 font-medium leading-relaxed">
                {violationMessage}
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-900 font-mono font-bold">
              {violationCount >= maxViolations
                ? "STRIKE LIMIT EXCEEDED. EXAM AUTO-SUBMITTING NOW..."
                : `WARNING: ${maxViolations - violationCount} STRIKES REMAINING BEFORE AUTO-SUBMIT.`}
            </div>

            {violationCount < maxViolations && (
              <button
                onClick={handleDismissModal}
                className="flat-button-danger w-full py-3 text-xs font-bold min-h-[44px] touch-manipulation"
              >
                I Understand - Return to Exam
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
