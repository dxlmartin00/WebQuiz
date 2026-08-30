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
} from "lucide-react";
import { QuestionDraft } from "@/types/quiz";

export default function NewQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz Settings
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [maxViolations, setMaxViolations] = useState(3);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleChoices, setShuffleChoices] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuestionDraft[]>([
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
  ]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch("/api/teacher/subjects");
        if (!res.ok) throw new Error("Failed to load subjects");
        const data = await res.json();
        setSubjects(data.subjects || []);
        if (data.subjects && data.subjects.length > 0) {
          setSubjectId(data.subjects[0].id);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadSubjects();
  }, []);

  const addQuestion = (type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER") => {
    if (type === "MULTIPLE_CHOICE") {
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

  const updateQuestion = (index: number, updated: Partial<QuestionDraft>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updated };
    setQuestions(next);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
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
          maxViolations: Number(maxViolations) || 3,
          deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
          isPublished,
          shuffleQuestions,
          shuffleChoices,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");

      router.push("/teacher/quizzes");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCalculatedPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

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

          <div className="flex items-center gap-3">
            <div className="text-right pr-3 border-r border-slate-200">
              <div className="text-xs font-bold text-slate-900">
                {questions.length} Questions
              </div>
              <div className="text-[11px] text-indigo-600 font-bold">
                {totalCalculatedPoints} Total Points
              </div>
            </div>
            <button
              onClick={handleSaveQuiz}
              disabled={submitting}
              className="flat-button-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? "Publishing..." : "Save & Publish Quiz"}</span>
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

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Description & Instructions
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Instructions for students regarding timing, integrity rules, and allowed attempts."
            className="flat-input text-xs resize-none"
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
              <span>Publish Quiz Immediately</span>
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
            2. Question Inventory & Grading Rules
          </h2>

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Questions Loop */}
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div
              key={qIndex}
              className="flat-card bg-white p-5 border border-slate-200 space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                    {qIndex + 1}
                  </span>
                  <span className="flat-badge-slate font-bold uppercase text-[10px]">
                    {q.type.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-3">
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

              {/* Question Prompt */}
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

              {/* Question Type Specific Inputs */}
              {q.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2 bg-slate-50 p-4 border border-slate-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Choices & Answer Key (Select the correct option):
                  </label>
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1">
                      Acceptable Answer(s) & Synonyms * (Comma-separated or list)
                    </label>
                    <input
                      type="text"
                      value={q.correctAnswers.join(", ")}
                      onChange={(e) => {
                        const synonyms = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        updateQuestion(qIndex, {
                          correctAnswers: synonyms.length > 0 ? synonyms : [e.target.value],
                        });
                      }}
                      placeholder="e.g. Random Access Memory, RAM, Random-Access Memory"
                      className="flat-input text-xs font-medium"
                      required
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Separate multiple valid synonyms/variations with commas.
                    </span>
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
          ))}
        </div>

        {/* Bottom Save Action */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => addQuestion("SHORT_ANSWER")}
            className="flat-button-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>

          <button
            type="button"
            onClick={handleSaveQuiz}
            disabled={submitting}
            className="flat-button-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "Saving..." : "Publish Quiz & Rules"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
