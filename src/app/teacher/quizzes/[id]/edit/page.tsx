"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  ShieldAlert,
  Save,
  AlertCircle,
  FileUp,
  UploadCloud,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { QuestionDraft } from "@/types/quiz";
import { SmartRulesAssistant } from "@/components/teacher/SmartRulesAssistant";
import { DocxImportModal } from "@/components/teacher/DocxImportModal";
import { ShortAnswerSynonymsInput } from "@/components/teacher/ShortAnswerSynonymsInput";

function formatForDatetimeLocal(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return "";
  const d = new Date(isoOrDateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz Settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [maxViolations, setMaxViolations] = useState(3);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleChoices, setShuffleChoices] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [isDocxModalOpen, setIsDocxModalOpen] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        const res = await fetch(`/api/teacher/quizzes/${id}`);
        if (!res.ok) throw new Error("Failed to load quiz");
        const data = await res.json();
        const q = data.quiz;

        setTitle(q.title);
        setDescription(q.description || "");
        setDurationMinutes(q.durationMinutes);
        setMaxViolations(q.maxViolations);
        setDeadlineAt(formatForDatetimeLocal(q.deadlineAt));
        setIsPublished(q.isPublished);
        setShuffleQuestions(q.shuffleQuestions);
        setShuffleChoices(q.shuffleChoices);
        setQuestions(
          q.questions.map((item: any) => ({
            type: item.type,
            prompt: item.prompt,
            points: item.points,
            options: item.options || [],
            correctAnswers: item.correctAnswers || [],
            isCaseSensitive: item.isCaseSensitive,
            allowFuzzy: item.allowFuzzy,
            fuzzyThreshold: item.fuzzyThreshold,
          }))
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [id]);

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

  const handleUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a quiz title.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/teacher/quizzes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes) || 20,
          maxViolations: Number(maxViolations) || 3,
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
          isPublished,
          shuffleQuestions,
          shuffleChoices,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quiz");

      router.push(`/teacher/quizzes/${id}/gradebook`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono">
        Loading quiz configuration...
      </div>
    );
  }

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
          href={`/teacher/quizzes/${id}/gradebook`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gradebook</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Edit Quiz & Grading Rules
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update test parameters, question synonyms, and anti-cheating strike limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={handleUpdateQuiz}
              disabled={submitting}
              className="flat-button-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>

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

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Quiz Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="flat-input text-xs font-semibold"
          />
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

        {/* Timing & Safeguards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Duration (Minutes)</span>
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Deadline Window (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="flat-input text-xs"
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
              <span>Published & Live</span>
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
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Questions & Matching Engine
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
                              updateQuestion(qIndex, {
                                points: Number(e.target.value) || 1,
                              })
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
                        required
                        className="flat-input text-xs resize-none"
                      />
                    </div>
                  )}

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
                      <span>Strict Case Sensitive</span>
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

        <button
          type="button"
          onClick={handleUpdateQuiz}
          disabled={submitting}
          className="flat-button-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{submitting ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>
      </div>

      <DocxImportModal
        isOpen={isDocxModalOpen}
        onClose={() => setIsDocxModalOpen(false)}
        onImport={handleImportQuestions}
        currentQuestionCount={questions.length}
      />
    </div>
  );
}
