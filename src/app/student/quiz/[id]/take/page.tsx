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
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
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

  // Network Offline Detection state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineSubmitModal, setOfflineSubmitModal] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(5);

  // Authoritative Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const timerInitializedRef = useRef(false);

  // Anti-Cheating Violation state
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");

  // Cooldown and Lockout Refs
  const isSubmittingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Network Online/Offline listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically sync cached local draft to server on reconnect
      try {
        const localSaved = localStorage.getItem(`webquiz_answers_${id}`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          fetch(`/api/student/quiz/${id}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: parsed }),
          }).catch(() => {});
        }
      } catch {}
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [id]);

  // Initialize session & load local draft backup if available
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

        // Check local storage backup first, fallback to server draft
        let initialAnswers: Record<string, string> = json.savedAnswers || {};
        try {
          const localDraft = localStorage.getItem(`webquiz_answers_${id}`);
          if (localDraft) {
            const parsed = JSON.parse(localDraft);
            initialAnswers = { ...initialAnswers, ...parsed };
          }
        } catch {}

        setAnswers(initialAnswers);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [id, router]);

  // Submit Handler with Automatic Offline Protection
  const handleSubmitQuiz = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      // Immediately cache to localStorage before attempting network call
      try {
        localStorage.setItem(`webquiz_answers_${id}`, JSON.stringify(answers));
      } catch {}

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

        setOfflineSubmitModal(false);
        setResult(json);
      } catch (e: any) {
        console.error("Submission failed due to network / connectivity:", e);
        // Do NOT crash or lose answers! Open Offline Recovery Modal
        isSubmittingRef.current = false;
        setOfflineSubmitModal(true);
      } finally {
        setSubmitting(false);
      }
    },
    [answers, id]
  );

  // Auto-retry submitting every 5s if offline submission modal is open
  useEffect(() => {
    if (!offlineSubmitModal) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        handleSubmitQuiz(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [offlineSubmitModal, handleSubmitQuiz]);

  // Countdown Timer
  useEffect(() => {
    if (loading || !data || result || secondsRemaining === null || !timerInitializedRef.current) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, data, result, secondsRemaining, handleSubmitQuiz]);

  // Log Violation Helper
  const recordViolation = useCallback(
    async (eventType: string, details: string) => {
      const now = Date.now();

      if (
        result ||
        isSubmittingRef.current ||
        isModalOpenRef.current ||
        offlineSubmitModal ||
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
    [id, result, offlineSubmitModal, handleSubmitQuiz]
  );

  // Anti-Cheating Event Listeners
  useEffect(() => {
    if (loading || !data || result || offlineSubmitModal) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("TAB_SWITCH", "Navigated away from active quiz tab");
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden && !isModalOpenRef.current) {
        recordViolation("WINDOW_BLUR", "Browser window lost focus");
      }
    };

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

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
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
  }, [loading, data, result, offlineSubmitModal, recordViolation]);

  // Answer change with instant LocalStorage backup + debounced server sync
  const handleAnswerChange = (questionId: string, value: string) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    // Instant local caching for 100% zero-data-loss protection
    try {
      localStorage.setItem(`webquiz_answers_${id}`, JSON.stringify(updated));
    } catch {}

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    if (navigator.onLine) {
      autosaveTimerRef.current = setTimeout(() => {
        fetch(`/api/student/quiz/${id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: { [questionId]: value } }),
        }).catch((e) => console.error("Autosave draft error:", e));
      }, 1200);
    }
  };

  // Emergency Backup File Download
  const downloadBackupAnswers = () => {
    const payload = {
      quizId: id,
      quizTitle: data?.quiz?.title,
      studentIdNumber: data?.studentIdNumber,
      timestamp: new Date().toISOString(),
      answers,
      integrityHash: btoa(JSON.stringify(answers)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webquiz_backup_${data?.quiz?.subjectCode || "exam"}_${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDismissModal = () => {
    setViolationModalOpen(false);
    setTimeout(() => {
      isModalOpenRef.current = false;
      lastViolationTimeRef.current = Date.now();
    }, 1500);
  };

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
          &copy; 2026 Aurora Alliance - Built with Next.js, Prisma, Tailwind CSS &amp; XLSX.
        </footer>
      </div>
    );
  }

  const { quiz, questions } = data;
  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;
  const isTimeCritical = secondsRemaining !== null && secondsRemaining <= 120;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none exam-lockdown">
      {/* Sticky Header Bar */}
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

          {/* Right: Network Status, Anti-Cheating Strikes & Submit Action */}
          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-900/90 text-amber-200 border border-amber-600 text-[11px] font-bold font-mono">
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Offline Mode</span>
              </div>
            )}

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
                if (confirm(`Submit your exam now? You have answered ${answeredCount} of ${questions.length} questions.`)) {
                  handleSubmitQuiz(false);
                }
              }}
              disabled={submitting}
              className="flat-button-primary text-xs py-1.5 sm:py-2 px-3 sm:px-4 font-bold flex items-center gap-1 min-h-[38px] touch-manipulation"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting..." : "Finish"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Internet connection lost. <strong>Do not leave or close this page!</strong> All your answers are saved securely on this device. Reconnect Wi-Fi or mobile data when submitting.
            </span>
          </div>
          <button
            onClick={downloadBackupAnswers}
            className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 border border-amber-700"
          >
            <Download className="w-3 h-3" />
            <span>Save Backup</span>
          </button>
        </div>
      )}

      {/* Main Exam Room Layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Col: Current Question Panel */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flat-card p-4 sm:p-6 bg-white border-2 border-slate-900 flex-1 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              {/* Question Index & Points Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {currentQuestion.points} {currentQuestion.points === 1 ? "Point" : "Points"}
                </span>
              </div>

              {/* Question Prompt */}
              <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </div>

              {/* Interactive Choice / Input Area */}
              <div className="pt-2">
                {currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE" ? (
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt: string, optIdx: number) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                          className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all min-h-[46px] touch-manipulation ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-950 shadow-xs"
                              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60 text-slate-800"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question_${currentQuestion.id}`}
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 text-indigo-600 accent-indigo-600 shrink-0"
                          />
                          <span className="text-xs sm:text-sm leading-relaxed select-none">
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : currentQuestion.type === "MULTIPLE_ANSWER" ? (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-500 italic">
                      Select all correct options that apply:
                    </p>
                    {currentQuestion.options.map((opt: string, optIdx: number) => {
                      let selectedArr: string[] = [];
                      try {
                        selectedArr = JSON.parse(answers[currentQuestion.id] || "[]");
                      } catch {
                        selectedArr = [];
                      }
                      const isChecked = selectedArr.includes(opt);

                      return (
                        <label
                          key={optIdx}
                          onClick={() => {
                            const newArr = isChecked
                              ? selectedArr.filter((item) => item !== opt)
                              : [...selectedArr, opt];
                            handleAnswerChange(currentQuestion.id, JSON.stringify(newArr));
                          }}
                          className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all min-h-[46px] touch-manipulation ${
                            isChecked
                              ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-950 shadow-xs"
                              : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60 text-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 text-indigo-600 accent-indigo-600 shrink-0"
                          />
                          <span className="text-xs sm:text-sm leading-relaxed select-none">
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Type your answer below:
                    </label>
                    <input
                      type="text"
                      placeholder="Type answer here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="flat-input text-xs sm:text-sm py-2.5 sm:py-3 w-full font-mono"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400">
                      Answer auto-saves locally immediately.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Nav Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="flat-button-secondary text-xs py-2 px-3 sm:px-4 font-semibold flex items-center gap-1 min-h-[40px] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-[11px] font-mono text-slate-500">
                {answeredCount} of {questions.length} Answered
              </div>

              <button
                onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                disabled={currentIdx === questions.length - 1}
                className="flat-button-secondary text-xs py-2 px-3 sm:px-4 font-semibold flex items-center gap-1 min-h-[40px] disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Question Grid Navigator */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flat-card p-4 sm:p-5 bg-white border border-slate-300 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-indigo-600" />
                <span>Question Matrix</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {questions.map((q: any, idx: number) => {
                const isAnswered = !!answers[q.id]?.trim() && answers[q.id] !== "[]";
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 text-xs font-mono font-bold border transition-all flex items-center justify-center min-h-[38px] touch-manipulation ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-indigo-500"
                        : isAnswered
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 inline-block" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 inline-block" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-900 inline-block ring-1 ring-indigo-500" />
                <span>Current</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Strike Modal */}
      {violationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="flat-card bg-white border-2 border-rose-600 p-6 sm:p-8 max-w-md w-full text-center space-y-4 animate-in zoom-in-95 shadow-2xl">
            <div className="w-12 h-12 bg-rose-50 border border-rose-300 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Anti-Cheating Warning Logged
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {violationMessage}
            </p>
            <p className="text-[11px] text-rose-700 font-bold bg-rose-50 p-2.5 border border-rose-200">
              Warning: Reaching {maxViolations} infractions will immediately submit your examination for grading.
            </p>
            <button
              onClick={handleDismissModal}
              className="flat-button-primary w-full py-2.5 text-xs font-bold"
            >
              I Understand & Return to Quiz
            </button>
          </div>
        </div>
      )}

      {/* Offline Submission Recovery Modal */}
      {offlineSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="flat-card bg-white border-2 border-amber-600 p-6 sm:p-8 max-w-md w-full text-center space-y-4 animate-in zoom-in-95 shadow-2xl">
            <div className="w-12 h-12 bg-amber-50 border border-amber-300 text-amber-600 flex items-center justify-center mx-auto">
              <WifiOff className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Network Connection Lost
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We could not reach the server because your internet connection dropped. <strong>Do not worry!</strong> All {answeredCount} of your answers are safely stored in your browser.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center justify-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auto-retrying submission when network reconnects...</span>
              </p>
              <p className="text-[11px] text-amber-700">
                Please check your Wi-Fi, hotspot, or mobile data connection.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={submitting}
                className="flat-button-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`} />
                <span>{submitting ? "Submitting..." : "Retry Submission Now"}</span>
              </button>

              <button
                onClick={downloadBackupAnswers}
                className="flat-button-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Emergency Offline Submission Proof (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
