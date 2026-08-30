"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileQuestion,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Edit,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/quizzes");
      if (!res.ok) throw new Error("Failed to load quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the quiz '${title}'? All submissions will also be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete quiz");
      fetchQuizzes();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const subjectCodes = Array.from(new Set(quizzes.map((q) => q.subjectCode)));

  const filteredQuizzes = quizzes.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.subjectCode.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "ALL" || q.subjectCode === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Quizzes & Assessments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build authoritative exams, configure automated grading algorithms, and audit integrity logs.
          </p>
        </div>

        <Link
          href="/teacher/quizzes/new"
          className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Build New Quiz</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quiz title or code..."
            className="flat-input text-xs py-1.5 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Subject:
          </span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="flat-input text-xs py-1.5 w-auto pr-8"
          >
            <option value="ALL">All Subjects</option>
            {subjectCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 font-mono">
          Loading quizzes and grading metrics...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white">
          <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">No quizzes found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {quizzes.length === 0
              ? "Create your first quiz with automated short-answer evaluation."
              : "No quizzes match your search filter."}
          </p>
          {quizzes.length === 0 && (
            <Link
              href="/teacher/quizzes/new"
              className="flat-button-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Quiz</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flat-card p-5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-400 transition-colors"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flat-badge-slate font-mono font-bold">
                    {quiz.subjectCode}
                  </span>
                  {quiz.isPublished ? (
                    <span className="flat-badge-emerald">Published</span>
                  ) : (
                    <span className="flat-badge-amber">Draft</span>
                  )}
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {quiz.durationMinutes}m duration
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    {quiz.totalQuestions} questions ({quiz.totalPoints} pts)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Max Violations: {quiz.maxViolations}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-2xl mt-0.5">
                    {quiz.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                <div className="text-left lg:text-right pr-2">
                  <div className="text-xs font-bold text-slate-900">
                    {quiz.completedCount} / {quiz.enrolledCount} Submissions
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Avg: {quiz.averageScore.toFixed(1)} pts
                    {quiz.totalViolations > 0 && (
                      <span className="text-rose-600 font-bold ml-2">
                        ({quiz.totalViolations} Flags)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/quizzes/${quiz.id}/gradebook`}
                    className="flat-button-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <span>Gradebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <a
                    href={`/api/teacher/quizzes/${quiz.id}/export`}
                    download
                    className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-slate-700"
                    title="Export XLSX Gradebook"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono text-[11px]">XLSX</span>
                  </a>

                  <Link
                    href={`/teacher/quizzes/${quiz.id}/edit`}
                    className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Edit Quiz"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(quiz.id, quiz.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 hover:bg-rose-50 transition-colors"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
