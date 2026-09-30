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
  Info,
  Flag,
  Check,
} from "lucide-react";
import Logo, { LogoIcon } from "@/components/ui/Logo";

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

  // UX Enhancements: Flagged Questions, Save Status & Review Modal
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Network Offline Detection state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineSubmitModal, setOfflineSubmitModal] = useState<boolean>(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(5);

  // Authoritative Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [itemSecondsRemaining, setItemSecondsRemaining] = useState<number | null>(null);
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
        if (json.quiz?.timerMode === "PER_ITEM") {
          setItemSecondsRemaining(json.quiz.timePerItemSeconds || 60);
        }
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

        // Restore flagged questions
        try {
          const localFlagged = localStorage.getItem(`webquiz_flagged_${id}`);
          if (localFlagged) {
            setFlaggedQuestions(JSON.parse(localFlagged));
          }
        } catch {}
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [id, router]);

  // Toggle question flag for review
  const handleToggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = prev.includes(questionId)
        ? prev.filter((item) => item !== questionId)
        : [...prev, questionId];
      try {
        localStorage.setItem(`webquiz_flagged_${id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [id]);

  // Submit Handler with Automatic Offline Protection
  const handleSubmitQuiz = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      // Immediately cancel any pending background autosave
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

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

        try {
          localStorage.removeItem(`webquiz_answers_${id}`);
          localStorage.removeItem(`webquiz_flagged_${id}`);
        } catch {}

        setOfflineSubmitModal(false);
        setShowSubmitModal(false);
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

  // Per-Item Advance Handler (auto-saves draft and locks prior questions)
  const handleAdvanceItem = useCallback(
    (isAuto = false) => {
      if (isSubmittingRef.current || result) return;

      const questions = data?.questions || [];
      const perItemDuration = data?.quiz?.timePerItemSeconds || 60;

      if (currentIdx < questions.length - 1) {
        // Flush current answer to server draft immediately
        const currQ = questions[currentIdx];
        if (currQ && answers[currQ.id] !== undefined) {
          fetch(`/api/student/quiz/${id}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: { [currQ.id]: answers[currQ.id] } }),
          }).catch(() => {});
        }

        setCurrentIdx((p) => p + 1);
        setItemSecondsRemaining(perItemDuration);
      } else {
        // Final question reached or expired!
        handleSubmitQuiz(isAuto);
      }
    },
    [currentIdx, data, answers, id, result, handleSubmitQuiz]
  );

  // Per-Item Countdown Timer
  useEffect(() => {
    const isPerItem = data?.quiz?.timerMode === "PER_ITEM";
    if (!isPerItem || loading || !data || result || itemSecondsRemaining === null || offlineSubmitModal) return;

    const timer = setInterval(() => {
      setItemSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleAdvanceItem(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data, loading, result, itemSecondsRemaining, offlineSubmitModal, handleAdvanceItem]);

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
    setSaveStatus("saving");

    // Instant local caching for 100% zero-data-loss protection
    try {
      localStorage.setItem(`webquiz_answers_${id}`, JSON.stringify(updated));
    } catch {}

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    if (navigator.onLine) {
      autosaveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/student/quiz/${id}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: { [questionId]: value } }),
          });
          setSaveStatus("saved");
        } catch (e) {
          console.error("Autosave draft error:", e);
          setSaveStatus("offline");
        }
      }, 1000);
    } else {
      setSaveStatus("offline");
    }
  };

  // Keyboard Shortcuts for Test-Taking UX (A-D / 1-4 to pick options, arrows to navigate, F to flag)
  useEffect(() => {
    if (loading || !data || result || offlineSubmitModal || violationModalOpen || showSubmitModal || submitting) return;

    const handleExamKeys = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in text inputs
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const q = data.questions[currentIdx];
      if (!q) return;

      const isPerItem = data?.quiz?.timerMode === "PER_ITEM";

      // Navigation
      if (e.key === "ArrowLeft") {
        if (!isPerItem && currentIdx > 0) {
          e.preventDefault();
          setCurrentIdx((p) => Math.max(0, p - 1));
        }
      } else if (e.key === "ArrowRight") {
        if (!isPerItem && currentIdx < data.questions.length - 1) {
          e.preventDefault();
          setCurrentIdx((p) => Math.min(data.questions.length - 1, p + 1));
        }
      } else if (e.key === "f" || e.key === "F") {
        if (q.type !== "INSTRUCTION") {
          e.preventDefault();
          handleToggleFlag(q.id);
        }
      } else if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        const keyMap: Record<string, number> = {
          "1": 0, "a": 0, "A": 0,
          "2": 1, "b": 1, "B": 1,
          "3": 2, "c": 2, "C": 2,
          "4": 3, "d": 3, "D": 3,
          "5": 4, "e": 4, "E": 4,
          "6": 5, "f": 5, "F": 5,
        };
        // Avoid collision with flag shortcut if 'f' is pressed unless it's option index 5
        if (e.key.toLowerCase() === "f" && (!q.options || q.options.length <= 5)) {
          return;
        }
        const optionIdx = keyMap[e.key];
        if (optionIdx !== undefined && q.options && optionIdx < q.options.length) {
          e.preventDefault();
          handleAnswerChange(q.id, q.options[optionIdx]);
        }
      }
    };

    window.addEventListener("keydown", handleExamKeys);
    return () => window.removeEventListener("keydown", handleExamKeys);
  }, [
    loading,
    data,
    result,
    offlineSubmitModal,
    violationModalOpen,
    showSubmitModal,
    currentIdx,
    answers,
    handleToggleFlag,
    submitting,
  ]);

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
            <Logo
              size="sm"
              theme="light"
              subtitle="Exam Submission"
              href="/student/dashboard"
            />
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
  const isPerItem = quiz?.timerMode === "PER_ITEM";
  const perItemDuration = quiz?.timePerItemSeconds || 60;
  const currentQuestion = questions[currentIdx];
  const gradableQuestions = questions.filter((q: any) => q.type !== "INSTRUCTION");
  const answeredCount = Object.keys(answers).filter(
    (k) =>
      !!answers[k]?.trim() &&
      answers[k] !== "[]" &&
      questions.find((q: any) => q.id === k)?.type !== "INSTRUCTION"
  ).length;
  const isTimeCritical = isPerItem
    ? itemSecondsRemaining !== null && itemSecondsRemaining <= 10
    : secondsRemaining !== null && secondsRemaining <= 120;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none exam-lockdown">
      {/* Sticky Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Left: Subject Code & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <LogoIcon size="xs" variant="indigo" />
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
                : isPerItem
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-slate-800 border-slate-700 text-white"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeCritical ? "text-rose-400" : isPerItem ? "text-amber-400" : "text-indigo-400"} shrink-0`} />
            <span>
              {isPerItem ? `Item: ${formatTime(itemSecondsRemaining)}` : formatTime(secondsRemaining)}
            </span>
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

            {/* Auto-Save Status Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono border bg-slate-800 border-slate-700 text-slate-300"
              title="Real-time exam auto-saving status"
            >
              {saveStatus === "saving" ? (
                <>
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "offline" ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Saved locally</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Saved</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="flat-button-primary text-xs py-1.5 sm:py-2 px-3 sm:px-4 font-bold flex items-center gap-1 min-h-[38px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`} />
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
          {isPerItem && (
            <div className="bg-amber-50 border border-amber-300 p-2.5 px-3.5 flex items-center justify-between text-xs text-amber-900 font-semibold shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Paced Exam Mode:</strong> {perItemDuration}s per item. Past questions are locked when advancing.
                </span>
              </div>
              <div className="font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 border border-amber-300 shrink-0">
                {itemSecondsRemaining !== null ? `${itemSecondsRemaining}s left` : "--"}
              </div>
            </div>
          )}

          <div className="flat-card p-4 sm:p-6 bg-white border-2 border-slate-900 flex-1 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              {/* Question Index & Points Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                    {currentQuestion.type === "INSTRUCTION"
                      ? "Section Instructions / Guidelines"
                      : `Question ${currentIdx + 1} of ${questions.length}`}
                  </span>

                  {currentQuestion.type !== "INSTRUCTION" && (
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQuestion.id)}
                      className={`text-xs px-2.5 py-0.5 font-bold flex items-center gap-1 border transition-all ${
                        flaggedQuestions.includes(currentQuestion.id)
                          ? "bg-amber-100 text-amber-900 border-amber-400"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                      title="Flag this question to review later (Hotkey: F)"
                    >
                      <Flag
                        className={`w-3 h-3 ${
                          flaggedQuestions.includes(currentQuestion.id)
                            ? "fill-amber-500 text-amber-600"
                            : "text-slate-400"
                        }`}
                      />
                      <span>{flaggedQuestions.includes(currentQuestion.id) ? "Flagged" : "Flag for Review"}</span>
                    </button>
                  )}
                </div>

                <span className="font-mono text-xs font-bold text-slate-500">
                  {currentQuestion.type === "INSTRUCTION"
                    ? "No points required"
                    : `${currentQuestion.points} ${currentQuestion.points === 1 ? "Point" : "Points"}`}
                </span>
              </div>

              {/* Question Prompt / Instruction Area */}
              {currentQuestion.type === "INSTRUCTION" ? (
                <div className="bg-indigo-50/60 border-2 border-indigo-200 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Instruction / Section Guidelines</span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                    {currentQuestion.prompt}
                  </div>
                  <div className="pt-3 border-t border-indigo-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="italic">
                      ℹ️ This is an instructional section note. No answer is required. Read the instructions and click <strong>Next</strong> to proceed.
                    </span>
                    <button
                      onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                      disabled={currentIdx === questions.length - 1}
                      className="flat-button-primary text-xs py-1.5 px-3 not-italic font-bold flex items-center gap-1"
                    >
                      <span>Continue to Questions</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {currentQuestion.prompt}
                  </div>

                  {/* Interactive Choice / Input Area */}
                  <div className="pt-2">
                    {currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE" ? (
                      <div className="space-y-2.5">
                        {currentQuestion.options.map((opt: string, optIdx: number) => {
                          const isSelected = answers[currentQuestion.id] === opt;
                          const choiceLetter = String.fromCharCode(65 + optIdx);
                          return (
                            <label
                              key={optIdx}
                              onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                              className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all min-h-[46px] touch-manipulation group ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-950 shadow-xs ring-1 ring-indigo-500/20"
                                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/70 text-slate-800"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                                }`}
                              >
                                {choiceLetter}
                              </span>
                              <input
                                type="radio"
                                name={`question_${currentQuestion.id}`}
                                checked={isSelected}
                                onChange={() => {}}
                                className="sr-only"
                              />
                              <span className="text-xs sm:text-sm leading-relaxed select-none pt-0.5">
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
                </>
              )}
            </div>

            {/* Bottom Nav Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => !isPerItem && setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0 || isPerItem}
                className="flat-button-secondary text-xs py-2 px-3 sm:px-4 font-semibold flex items-center gap-1 min-h-[40px] disabled:opacity-40"
                title={isPerItem ? "Previous questions are locked in Per-Item mode" : undefined}
              >
                {isPerItem ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isPerItem ? "Previous (Locked)" : "Previous"}</span>
              </button>

              <div className="text-[11px] font-mono text-slate-500">
                {answeredCount} of {gradableQuestions.length} Answered
              </div>

              {isPerItem ? (
                <button
                  onClick={() => {
                    if (currentIdx === questions.length - 1) {
                      setShowSubmitModal(true);
                    } else {
                      handleAdvanceItem(false);
                    }
                  }}
                  disabled={submitting}
                  className="flat-button-primary text-xs py-2 px-3 sm:px-4 font-semibold flex items-center gap-1 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{currentIdx === questions.length - 1 ? (submitting ? "Submitting..." : "Finish & Submit") : "Lock & Next"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                  disabled={currentIdx === questions.length - 1}
                  className="flat-button-secondary text-xs py-2 px-3 sm:px-4 font-semibold flex items-center gap-1 min-h-[40px] disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
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
                {answeredCount}/{gradableQuestions.length}
              </span>
            </div>

            {/* Number grid */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {questions.map((q: any, idx: number) => {
                const isInstruction = q.type === "INSTRUCTION";
                const isAnswered = !isInstruction && !!answers[q.id]?.trim() && answers[q.id] !== "[]";
                const isFlagged = flaggedQuestions.includes(q.id);
                const isCurrent = idx === currentIdx;
                const isPastLocked = isPerItem && idx < currentIdx;
                const isFutureLocked = isPerItem && idx > currentIdx;
                const isLocked = isPastLocked || isFutureLocked;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (!isLocked) {
                        setCurrentIdx(idx);
                      }
                    }}
                    disabled={isLocked}
                    title={
                      isPastLocked
                        ? `Question ${idx + 1} (Locked - Cannot return)`
                        : isFutureLocked
                        ? `Question ${idx + 1} (Locked until reached)`
                        : isInstruction
                        ? `Section Note: ${q.prompt.slice(0, 30)}...`
                        : `Question ${idx + 1}${isFlagged ? " (Flagged for Review)" : ""}`
                    }
                    className={`relative h-9 text-xs font-mono font-bold border transition-all flex items-center justify-center min-h-[38px] touch-manipulation ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-indigo-500"
                        : isPastLocked
                        ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-80"
                        : isFutureLocked
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                        : isInstruction
                        ? "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                        : isAnswered
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {isFlagged && (
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white"
                        title="Flagged for review"
                      />
                    )}
                    {isPastLocked ? <Lock className="w-3 h-3 text-slate-500" /> : isInstruction ? "§" : idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 inline-block" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 inline-block" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-900 inline-block ring-1 ring-indigo-500" />
                <span>Current</span>
              </div>
              {isPerItem && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-2.5 h-2.5 bg-slate-200 border border-slate-300 inline-block flex items-center justify-center">
                    <Lock className="w-2 h-2 text-slate-500" />
                  </span>
                  <span>Locked Past Questions</span>
                </div>
              )}
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

      {/* Pre-Submission Comprehensive Review Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="flat-card bg-white border-2 border-slate-900 p-6 sm:p-8 max-w-lg w-full space-y-5 animate-in zoom-in-95 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Review & Final Submission
                </h2>
                <p className="text-xs text-slate-500">
                  Please verify your progress before turning in your examination.
                </p>
              </div>
            </div>

            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Answered
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                  {answeredCount}
                </span>
              </div>
              <div
                className={`p-3 border ${
                  gradableQuestions.length - answeredCount > 0
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider block">
                  Unanswered
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {Math.max(0, gradableQuestions.length - answeredCount)}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800">
                <span className="text-[10px] uppercase font-bold tracking-wider block">
                  Flagged
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {flaggedQuestions.length}
                </span>
              </div>
            </div>

            {/* Unanswered warning banner */}
            {gradableQuestions.length - answeredCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    You have {gradableQuestions.length - answeredCount} unanswered {gradableQuestions.length - answeredCount === 1 ? "question" : "questions"}!
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Unanswered items receive zero points. We recommend checking them before finalizing your exam.
                </p>
                {!isPerItem && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstUnansweredIdx = questions.findIndex(
                        (q: any) =>
                          q.type !== "INSTRUCTION" &&
                          (!answers[q.id]?.trim() || answers[q.id] === "[]")
                      );
                      if (firstUnansweredIdx !== -1) {
                        setCurrentIdx(firstUnansweredIdx);
                      }
                      setShowSubmitModal(false);
                    }}
                    className="flat-button-secondary text-xs py-1.5 px-3 bg-white border-amber-300 text-amber-900 font-bold hover:bg-amber-100"
                  >
                    &larr; Jump to First Unanswered Question
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  All {gradableQuestions.length} questions answered! Ready for scoring.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="flat-button-secondary text-xs py-2 px-4 w-full sm:w-auto font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Reviewing
              </button>

              <button
                type="button"
                onClick={() => handleSubmitQuiz(false)}
                disabled={submitting}
                className="flat-button-primary text-xs py-2 px-5 w-full sm:w-auto font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`} />
                <span>{submitting ? "Submitting & Grading..." : "Confirm & Submit Examination"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Interaction Barrier during Submission & Grading */}
      {submitting && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none pointer-events-auto cursor-wait"
          role="dialog"
          aria-modal="true"
        >
          <div className="flat-card border-2 border-slate-900 bg-white p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-indigo-50 border-2 border-indigo-600 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Submitting &amp; Grading...
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Please wait while your answers are verified and graded.
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-full w-2/3 animate-pulse"></div>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Do not close or reload this page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
