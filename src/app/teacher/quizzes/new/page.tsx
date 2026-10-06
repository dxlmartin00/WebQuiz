"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  FileUp,
  UploadCloud,
  FileText,
  ChevronUp,
  ChevronDown,
  KeyRound,
  RotateCcw,
  History,
  Calendar,
} from "lucide-react";
import { QuestionDraft } from "@/types/quiz";
import { SmartRulesAssistant } from "@/components/teacher/SmartRulesAssistant";
import { DocxImportModal } from "@/components/teacher/DocxImportModal";
import { AnswerKeyModal } from "@/components/teacher/AnswerKeyModal";
import { ShortAnswerSynonymsInput } from "@/components/teacher/ShortAnswerSynonymsInput";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

const DRAFT_STORAGE_KEY = "webquiz_teacher_quiz_draft_new";

function formatWindowDuration(startStr: string, deadlineStr: string): string {
  try {
    const s = new Date(startStr);
    const d = new Date(deadlineStr);
    const diffMs = d.getTime() - s.getTime();
    if (diffMs <= 0) return "Invalid";
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 && days === 0) parts.push(`${mins}m`);
    return parts.join(" ") || "< 1m";
  } catch {
    return "";
  }
}

const DEFAULT_QUESTIONS: QuestionDraft[] = [
  {
    type: "MULTIPLE_CHOICE",
    prompt: "Which protocol operates at the Transport Layer of the OSI Model?",
    points: 2,
    options: ["TCP", "HTTP", "IP", "DNS"],
    correctAnswers: ["TCP"],
    isCaseSensitive: false,
    allowFuzzy: false,
    fuzzyThreshold: 1,
  },
  {
    type: "TRUE_FALSE",
    prompt: "Relational databases use SQL as their standard query language.",
    points: 1,
    options: ["True", "False"],
    correctAnswers: ["True"],
    isCaseSensitive: false,
    allowFuzzy: false,
    fuzzyThreshold: 1,
  },
  {
    type: "SHORT_ANSWER",
    prompt: "What does CPU stand for?",
    points: 2,
    options: [],
    correctAnswers: ["Central Processing Unit", "CPU"],
    isCaseSensitive: false,
    allowFuzzy: true,
    fuzzyThreshold: 1,
  },
];

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NewQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Draft persistence state
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [restoredTime, setRestoredTime] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Quiz Settings
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [timerMode, setTimerMode] = useState<"WHOLE_QUIZ" | "PER_ITEM">("WHOLE_QUIZ");
  const [timePerItemSeconds, setTimePerItemSeconds] = useState(60);
  const [maxViolations, setMaxViolations] = useState(3);
  const [startAt, setStartAt] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleChoices, setShuffleChoices] = useState(false);
  const [isDocxModalOpen, setIsDocxModalOpen] = useState(false);
  const [isAnswerKeyModalOpen, setIsAnswerKeyModalOpen] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuestionDraft[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch("/api/teacher/subjects");
        if (!res.ok) throw new Error("Failed to load subjects");
        const data = await res.json();
        const loadedSubjects = data.subjects || [];
        setSubjects(loadedSubjects);

        // Check for saved draft in localStorage
        const savedDraftRaw =
          typeof window !== "undefined" ? localStorage.getItem(DRAFT_STORAGE_KEY) : null;

        if (savedDraftRaw) {
          try {
            const draft = JSON.parse(savedDraftRaw);
            if (draft && typeof draft === "object") {
              if (draft.subjectId && loadedSubjects.some((s: any) => s.id === draft.subjectId)) {
                setSubjectId(draft.subjectId);
              } else if (loadedSubjects.length > 0) {
                setSubjectId(loadedSubjects[0].id);
              }
              if (typeof draft.title === "string") setTitle(draft.title);
              if (typeof draft.description === "string") setDescription(draft.description);
              if (typeof draft.durationMinutes === "number") setDurationMinutes(draft.durationMinutes);
              if (draft.timerMode === "WHOLE_QUIZ" || draft.timerMode === "PER_ITEM") {
                setTimerMode(draft.timerMode);
              }
              if (typeof draft.timePerItemSeconds === "number") setTimePerItemSeconds(draft.timePerItemSeconds);
              if (typeof draft.maxViolations === "number") setMaxViolations(draft.maxViolations);
              if (typeof draft.startAt === "string") setStartAt(draft.startAt);
              if (typeof draft.deadlineAt === "string") setDeadlineAt(draft.deadlineAt);
              if (typeof draft.isPublished === "boolean") setIsPublished(draft.isPublished);
              if (typeof draft.shuffleQuestions === "boolean") setShuffleQuestions(draft.shuffleQuestions);
              if (typeof draft.shuffleChoices === "boolean") setShuffleChoices(draft.shuffleChoices);
              if (Array.isArray(draft.questions) && draft.questions.length > 0) {
                setQuestions(draft.questions);
              }
              if (draft.savedAt) {
                setRestoredTime(draft.savedAt);
                setLastSavedTime(draft.savedAt);

                const hasMeaningfulContent =
                  (draft.title && draft.title.trim().length > 0) ||
                  (draft.description && draft.description.trim().length > 0) ||
                  (Array.isArray(draft.questions) && draft.questions.length !== 3);

                if (hasMeaningfulContent) {
                  setShowRestoredBanner(true);
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse saved quiz draft:", err);
          }
        } else if (loadedSubjects.length > 0) {
          setSubjectId(loadedSubjects[0].id);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        setIsInitialLoadComplete(true);
      }
    }
    loadSubjects();
  }, []);

  // Auto-save draft whenever quiz builder state changes
  useEffect(() => {
    if (!isInitialLoadComplete) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          subjectId,
          title,
          description,
          durationMinutes,
          timerMode,
          timePerItemSeconds,
          maxViolations,
          startAt,
          deadlineAt,
          isPublished,
          shuffleQuestions,
          shuffleChoices,
          questions,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLastSavedTime(draft.savedAt);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    isInitialLoadComplete,
    subjectId,
    title,
    description,
    durationMinutes,
    timerMode,
    timePerItemSeconds,
    maxViolations,
    startAt,
    deadlineAt,
    isPublished,
    shuffleQuestions,
    shuffleChoices,
    questions,
  ]);

  // Warn on tab closing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent =
        title.trim().length > 0 ||
        questions.length !== 3 ||
        description.trim().length > 0;
      if (hasContent && !submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, questions, description, submitting]);

  const handleDiscardDraft = () => {
    if (!window.confirm("Are you sure you want to discard this draft? Your quiz builder progress will be reset.")) {
      return;
    }
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}

    setShowRestoredBanner(false);
    setRestoredTime(null);
    setLastSavedTime(null);
    setTitle("");
    setDescription("");
    setDurationMinutes(20);
    setTimerMode("WHOLE_QUIZ");
    setTimePerItemSeconds(60);
    setMaxViolations(3);
    setDeadlineAt("");
    setIsPublished(true);
    setShuffleQuestions(false);
    setShuffleChoices(false);
    setQuestions(DEFAULT_QUESTIONS);
    if (subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
  };

  const addQuestion = (type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "INSTRUCTION") => {
    if (type === "INSTRUCTION") {
      setQuestions([
        ...questions,
        {
          type: "INSTRUCTION",
          prompt: "",
          points: 0,
          options: [],
          correctAnswers: [],
          isCaseSensitive: false,
          allowFuzzy: false,
          fuzzyThreshold: 1,
        },
      ]);
    } else if (type === "MULTIPLE_CHOICE") {
      setQuestions([
        ...questions,
        {
          type: "MULTIPLE_CHOICE",
          prompt: "",
          points: 1,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswers: ["Option A"],
          isCaseSensitive: false,
          allowFuzzy: false,
          fuzzyThreshold: 1,
        },
      ]);
    } else if (type === "TRUE_FALSE") {
      setQuestions([
        ...questions,
        {
          type: "TRUE_FALSE",
          prompt: "",
          points: 1,
          options: ["True", "False"],
          correctAnswers: ["True"],
          isCaseSensitive: false,
          allowFuzzy: false,
          fuzzyThreshold: 1,
        },
      ]);
    } else {
      setQuestions([
        ...questions,
        {
          type: "SHORT_ANSWER",
          prompt: "",
          points: 2,
          options: [],
          correctAnswers: [""],
          isCaseSensitive: false,
          allowFuzzy: true,
          fuzzyThreshold: 1,
        },
      ]);
    }
  };

  const moveQuestion = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setQuestions(next);
  };

  const updateQuestion = (index: number, updated: Partial<QuestionDraft>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updated };
    setQuestions(next);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleImportQuestions = (importedQuestions: QuestionDraft[], mode: "append" | "replace") => {
    if (mode === "replace") {
      setQuestions(importedQuestions);
    } else {
      setQuestions((prev) => [...prev, ...importedQuestions]);
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError("Please select a subject class.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a quiz title.");
      return;
    }

    if (startAt && deadlineAt && new Date(deadlineAt) <= new Date(startAt)) {
      setError("Closing deadline must be set after the quiz start time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          title: title.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes) || 20,
          timerMode,
          timePerItemSeconds: Number(timePerItemSeconds) || 60,
          maxViolations: Number(maxViolations) || 3,
          startAt: startAt ? new Date(startAt).toISOString() : null,
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
          isPublished,
          shuffleQuestions,
          shuffleChoices,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");

      // Clear draft upon successful creation
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setRedirecting(true);
      router.push("/teacher/quizzes");
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const totalCalculatedPoints = questions.reduce(
    (sum, q) => sum + (q.type === "INSTRUCTION" ? 0 : (Number(q.points) || 1)),
    0
  );
  const gradableQuestionsCount = questions.filter((q) => q.type !== "INSTRUCTION").length;
  const instructionNotesCount = questions.filter((q) => q.type === "INSTRUCTION").length;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="space-y-4 pb-6 border-b border-slate-200">
        <Link
          href="/teacher/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quizzes</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Interactive Quiz Builder
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure parameters, anti-cheating strike limits, and automated evaluation matching rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastSavedTime && (
              <div
                className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-100 px-2.5 py-1 border border-slate-200"
                title={`Last auto-saved: ${new Date(lastSavedTime).toLocaleTimeString()}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Auto-saved {formatTimeAgo(lastSavedTime)}</span>
              </div>
            )}

            <div className="text-right pr-3 border-r border-slate-200">
              <div className="text-xs font-bold text-slate-900">
                {gradableQuestionsCount} Questions
                {instructionNotesCount > 0 && (
                  <span className="text-slate-500 font-normal"> + {instructionNotesCount} Notes</span>
                )}
              </div>
              <div className="text-[11px] text-indigo-600 font-bold">
                {totalCalculatedPoints} Total Points
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDocxModalOpen(true)}
              className="flat-button-secondary text-xs py-2 px-3 bg-indigo-50 border-indigo-300 text-indigo-700 font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload Questionnaire</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAnswerKeyModalOpen(true)}
              className="flat-button-secondary text-xs py-2 px-3 bg-emerald-50 border-emerald-300 text-emerald-800 font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-xs"
              title="Upload answer key file or paste text to match correct answers"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload Answer Key</span>
            </button>

            <button
              onClick={handleSaveQuiz}
              disabled={submitting || redirecting}
              className="flat-button-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {redirecting
                  ? "Redirecting..."
                  : submitting
                  ? "Publishing Quiz..."
                  : "Save & Publish Quiz"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Restored Draft Alert Banner */}
      {showRestoredBanner && (
        <div className="p-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-xs sm:text-sm">
                Unsaved quiz draft restored
              </p>
              <p className="text-[11px] sm:text-xs text-indigo-800">
                Your previous quiz builder progress was automatically recovered{restoredTime ? ` (saved ${formatTimeAgo(restoredTime)})` : ""}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="flat-button-secondary text-xs py-1.5 px-3 bg-white text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400 font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Draft</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRestoredBanner(false)}
              className="flat-button-primary text-xs py-1.5 px-3 font-bold"
            >
              Keep Working
            </button>
          </div>
        </div>
      )}

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Configuration Parameters */}
      <div className="flat-card bg-white p-6 border border-slate-200 space-y-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
          1. General Settings & Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Subject Class *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="flat-input text-xs"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectCode} - {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Quiz Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Examination: Systems & Architecture"
              required
              className="flat-input text-xs font-semibold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Description & Instructions
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Enter custom instructions or use the assistant below to generate rules based on your active parameters."
            className="flat-input text-xs"
          />
          <SmartRulesAssistant
            durationMinutes={durationMinutes}
            maxViolations={maxViolations}
            questionCount={questions.length}
            totalPoints={totalCalculatedPoints}
            currentDescription={description}
            onUpdateDescription={setDescription}
          />
        </div>

        {/* Timing Mode Selection */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Exam Timing Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              onClick={() => setTimerMode("WHOLE_QUIZ")}
              className={`p-3.5 border cursor-pointer flex items-start gap-3 transition-all ${
                timerMode === "WHOLE_QUIZ"
                  ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-500"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="timerMode"
                checked={timerMode === "WHOLE_QUIZ"}
                onChange={() => setTimerMode("WHOLE_QUIZ")}
                className="mt-0.5 text-indigo-600 accent-indigo-600"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Whole Quiz Timer (Standard)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  Single countdown clock for the entire exam. Students can move back and forth between questions anytime.
                </p>
              </div>
            </label>

            <label
              onClick={() => setTimerMode("PER_ITEM")}
              className={`p-3.5 border cursor-pointer flex items-start gap-3 transition-all ${
                timerMode === "PER_ITEM"
                  ? "border-amber-600 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-500"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="timerMode"
                checked={timerMode === "PER_ITEM"}
                onChange={() => setTimerMode("PER_ITEM")}
                className="mt-0.5 text-amber-600 accent-amber-600"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Duration Per Item (Paced / Speed Exam)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  Fixed timer for each question. When time reaches 0, the answer is locked and auto-advances. Students cannot change past items.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Timing & Safeguards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {timerMode === "WHOLE_QUIZ" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Quiz Duration (Minutes)</span>
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={1}
                max={300}
                className="flat-input text-xs font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Seconds Per Item</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={timePerItemSeconds}
                  onChange={(e) => setTimePerItemSeconds(Math.max(5, Number(e.target.value)))}
                  min={5}
                  max={600}
                  className="flat-input text-xs font-mono pr-10"
                />
                <span className="absolute right-2.5 top-2 text-[11px] font-mono text-slate-400">sec</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                ~{Math.round((questions.filter(q => q.type !== 'INSTRUCTION').length * timePerItemSeconds) / 60)} min total estimated exam time.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-500" />
              <span>Max Tab Blur Strikes</span>
            </label>
            <input
              type="number"
              value={maxViolations}
              onChange={(e) => setMaxViolations(Number(e.target.value))}
              min={1}
              max={10}
              className="flat-input text-xs font-mono"
            />
          </div>

          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-none border-slate-300"
              />
              <span>Publish Quiz Immediately</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-none border-slate-300"
              />
              <span>Shuffle Questions Order</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleChoices}
                onChange={(e) => setShuffleChoices(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-none border-slate-300"
              />
              <span>Shuffle MCQ Choices</span>
            </label>
          </div>
        </div>

        {/* Dedicated Paired Availability & Schedule Window Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quiz Availability & Schedule Window</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Set when students can begin taking the quiz and when submissions lock. Both are optional.
              </p>
            </div>

            {/* Live Window Duration Indicator */}
            {startAt && deadlineAt && (
              <div>
                {new Date(deadlineAt) <= new Date(startAt) ? (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 inline-flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Deadline must be after start time</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    <span>Availability window: {formatWindowDuration(startAt, deadlineAt)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateTimePicker
              label="Starting Date & Time (Opens At)"
              helperText="Students cannot open or answer this quiz before this timestamp. Leave empty to open immediately."
              value={startAt}
              onChange={setStartAt}
              placeholder="Open immediately upon publishing"
            />

            <DateTimePicker
              label="Closing Deadline (Closes At)"
              helperText="Submissions automatically lock after this timestamp. Leave empty for no closing deadline."
              value={deadlineAt}
              onChange={setDeadlineAt}
              minDate={startAt || undefined}
              placeholder="No deadline (Never closes)"
            />
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Question Inventory & Grading Rules
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDocxModalOpen(true)}
              className="flat-button-secondary text-xs py-1 px-3 bg-indigo-50 border-indigo-300 text-indigo-700 font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload Questionnaire (.docx / Paste)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAnswerKeyModalOpen(true)}
              className="flat-button-secondary text-xs py-1 px-3 bg-emerald-50 border-emerald-300 text-emerald-800 font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-xs"
              title="Upload answer key file or paste text to match correct answers"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload Answer Key</span>
            </button>

            <span className="text-xs text-slate-400 font-semibold mx-1">|</span>
            <span className="text-xs text-slate-500 font-semibold mr-1">Add:</span>
            <button
              type="button"
              onClick={() => addQuestion("MULTIPLE_CHOICE")}
              className="flat-button-secondary text-xs py-1 px-2.5"
            >
              + Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => addQuestion("TRUE_FALSE")}
              className="flat-button-secondary text-xs py-1 px-2.5"
            >
              + True/False
            </button>
            <button
              type="button"
              onClick={() => addQuestion("SHORT_ANSWER")}
              className="flat-button-secondary text-xs py-1 px-2.5 bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
            >
              + Short Answer / Fuzzy
            </button>
            <button
              type="button"
              onClick={() => addQuestion("INSTRUCTION")}
              className="flat-button-secondary text-xs py-1 px-2.5 bg-slate-100 border-slate-300 text-slate-800 font-bold hover:bg-slate-200 flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>+ Instruction / Text Field</span>
            </button>
          </div>
        </div>

        {/* Questions Loop */}
        <div className="space-y-4">
          {(() => {
            let questionNumber = 0;
            return questions.map((q, qIndex) => {
              const isInstruction = q.type === "INSTRUCTION";
              if (!isInstruction) questionNumber++;
              const displayNum = questionNumber;

              return (
                <div
                  key={qIndex}
                  className={`flat-card bg-white p-5 border space-y-4 transition-colors ${
                    isInstruction
                      ? "border-2 border-slate-300 bg-slate-50/40"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      {isInstruction ? (
                        <span
                          className="w-6 h-6 bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center"
                          title="Instruction / Section Note"
                        >
                          §
                        </span>
                      ) : (
                        <span className="w-6 h-6 bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {displayNum}
                        </span>
                      )}

                      <span
                        className={`font-bold uppercase text-[10px] px-2 py-0.5 ${
                          isInstruction
                            ? "bg-slate-800 text-white"
                            : "flat-badge-slate"
                        }`}
                      >
                        {isInstruction ? "Instruction / Section Note" : q.type.replace("_", " ")}
                      </span>

                      {!isInstruction && q.correctAnswers.length === 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5">
                          ⚠️ Needs Answer Selection
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex items-center border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIndex, "up")}
                          disabled={qIndex === 0}
                          title="Move Up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIndex, "down")}
                          disabled={qIndex === questions.length - 1}
                          title="Move Down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isInstruction ? (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 border border-slate-200">
                          0 Pts (Instruction Note)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600">Points:</span>
                          <input
                            type="number"
                            value={q.points}
                            onChange={(e) =>
                              updateQuestion(qIndex, { points: Number(e.target.value) || 1 })
                            }
                            min={1}
                            className="flat-input w-14 text-xs font-mono py-1 text-center"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        disabled={questions.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt / Instruction Area */}
                  {isInstruction ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Instruction / Section Text *
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Shown to students between questions (not graded)
                        </span>
                      </div>
                      <textarea
                        value={q.prompt}
                        onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                        rows={3}
                        placeholder="Enter instructions for this section (e.g. Part II - Identify the Tool&#10;Directions: Write the exact name of the Figma tool shown or described below. Be careful with your spelling.)"
                        required
                        className="flat-input text-xs resize-none font-medium"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Question Prompt *
                      </label>
                      <textarea
                        value={q.prompt}
                        onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                        rows={2}
                        placeholder="Enter the question text or problem statement..."
                        required
                        className="flat-input text-xs resize-none"
                      />
                    </div>
                  )}

              {/* Question Type Specific Inputs */}
              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2 bg-slate-50 p-4 border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Choices & Answer Key (Select the correct option):
                    </label>
                    {q.correctAnswers.length === 0 && (
                      <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 border border-amber-200">
                        ⚡ Click the radio circle next to the correct choice
                      </span>
                    )}
                  </div>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q_${qIndex}_correct`}
                        checked={q.correctAnswers[0] === opt}
                        onChange={() => updateQuestion(qIndex, { correctAnswers: [opt] })}
                        className="w-4 h-4 text-indigo-600 border-slate-300"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[optIndex] = e.target.value;
                          const wasCorrect = q.correctAnswers[0] === opt;
                          updateQuestion(qIndex, {
                            options: newOpts,
                            correctAnswers: wasCorrect ? [e.target.value] : q.correctAnswers,
                          });
                        }}
                        className="flat-input text-xs py-1.5"
                        placeholder={`Choice ${optIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (q.options.length <= 2) return;
                          const newOpts = q.options.filter((_, i) => i !== optIndex);
                          updateQuestion(qIndex, {
                            options: newOpts,
                            correctAnswers:
                              q.correctAnswers[0] === opt ? [newOpts[0]] : q.correctAnswers,
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(qIndex, {
                        options: [...q.options, `New Option ${q.options.length + 1}`],
                      })
                    }
                    className="text-xs font-bold text-indigo-600 hover:underline pt-1"
                  >
                    + Add Choice Option
                  </button>
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <div className="bg-slate-50 p-4 border border-slate-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Correct Answer:
                  </label>
                  <div className="flex items-center gap-6">
                    {["True", "False"].map((tf) => (
                      <label
                        key={tf}
                        className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`q_${qIndex}_tf`}
                          checked={q.correctAnswers[0] === tf}
                          onChange={() => updateQuestion(qIndex, { correctAnswers: [tf] })}
                          className="w-4 h-4 text-indigo-600 border-slate-300"
                        />
                        <span>{tf}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {q.type === "SHORT_ANSWER" && (
                <div className="bg-indigo-50/50 p-4 border border-indigo-200 space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                        Acceptable Answer(s) & Synonyms *
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Separate multiple valid variations/synonyms with commas
                      </span>
                    </div>
                    <ShortAnswerSynonymsInput
                      correctAnswers={q.correctAnswers}
                      onChange={(synonyms) =>
                        updateQuestion(qIndex, { correctAnswers: synonyms })
                      }
                      placeholder="e.g. Move Tool, V, Pointer (separate synonyms with commas)"
                      required
                    />
                  </div>

                  {/* Matching Rules Toggles */}
                  <div className="pt-2 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.isCaseSensitive}
                        onChange={(e) =>
                          updateQuestion(qIndex, { isCaseSensitive: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 rounded-none border-slate-300"
                      />
                      <span>Strict Case Sensitive (e.g. Code, Acronyms)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.allowFuzzy}
                          onChange={(e) =>
                            updateQuestion(qIndex, { allowFuzzy: e.target.checked })
                          }
                          className="w-4 h-4 text-indigo-600 rounded-none border-slate-300"
                        />
                        <span>Allow Typo / Fuzzy Match</span>
                      </label>

                      {q.allowFuzzy && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <span>(Distance:</span>
                          <input
                            type="number"
                            value={q.fuzzyThreshold}
                            onChange={(e) =>
                              updateQuestion(qIndex, {
                                fuzzyThreshold: Number(e.target.value) || 1,
                              })
                            }
                            min={1}
                            max={3}
                            className="flat-input w-10 text-xs py-0.5 px-1 font-mono text-center"
                          />
                          <span>)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}
      </div>

      {/* Bottom Save Action */}
      <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold mr-1">Add to Quiz:</span>
          <button
            type="button"
            onClick={() => addQuestion("MULTIPLE_CHOICE")}
            className="flat-button-secondary text-xs py-1.5 px-3"
          >
            + Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => addQuestion("TRUE_FALSE")}
            className="flat-button-secondary text-xs py-1.5 px-3"
          >
            + True/False
          </button>
          <button
            type="button"
            onClick={() => addQuestion("SHORT_ANSWER")}
            className="flat-button-secondary text-xs py-1.5 px-3 bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
          >
            + Short Answer / Fuzzy
          </button>
          <button
            type="button"
            onClick={() => addQuestion("INSTRUCTION")}
            className="flat-button-secondary text-xs py-1.5 px-3 bg-slate-100 border-slate-300 text-slate-800 font-bold hover:bg-slate-200 flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Instruction / Text Field</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="flat-button-secondary text-xs py-2 px-3 text-slate-500 hover:text-rose-600 hover:border-rose-300 font-medium transition-colors"
            title="Clear all unsaved progress and start over"
          >
            Clear Draft
          </button>

          <button
            type="button"
            onClick={handleSaveQuiz}
            disabled={submitting || redirecting}
            className="flat-button-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {redirecting
                ? "Redirecting..."
                : submitting
                ? "Publishing Quiz..."
                : "Publish Quiz & Rules"}
            </span>
          </button>
        </div>
      </div>
      </div>

      <DocxImportModal
        isOpen={isDocxModalOpen}
        onClose={() => setIsDocxModalOpen(false)}
        onImport={handleImportQuestions}
        currentQuestionCount={questions.length}
      />

      <AnswerKeyModal
        isOpen={isAnswerKeyModalOpen}
        onClose={() => setIsAnswerKeyModalOpen(false)}
        questions={questions}
        onApplyAnswers={(updatedQuestions) => {
          setQuestions(updatedQuestions);
          setIsAnswerKeyModalOpen(false);
          setSuccessToast("Answer key applied successfully to your questions!");
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />
    </div>
  );
}
