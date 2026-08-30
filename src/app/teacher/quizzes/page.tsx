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
  RefreshCw,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastContext";

export default function TeacherQuizzesPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("ALL");

  // Deletion modal
  const [quizToDelete, setQuizToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/quizzes");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load quizzes");
      }
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (e: any) {
      setError(e.message);
      toast.error("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/teacher/quizzes/${quizToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete quiz");
      }
      toast.success("Quiz Deleted", `Quiz '${quizToDelete.title}' and student submissions were deleted.`);
      setQuizToDelete(null);
      fetchQuizzes();
    } catch (e: any) {
      toast.error("Deletion Error", e.message);
    } finally {
      setDeleting(false);
    }
  };

  const subjectCodes = Array.from(new Set(quizzes.map((q) => q.subjectCode)));

  const filteredQuizzes = quizzes.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.subjectCode.toLowerCase().includes(search.toLowerCase());
    const matchSubject =
      filterSubject === "ALL" || q.subjectCode === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-indigo-600" />
            <span>Quizzes & Assessments</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build interactive exams, configure proctoring limits, and export instant gradebooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/teacher/quizzes/new"
            className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Quiz</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search quiz by title or class code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flat-input text-xs pl-9 py-2 w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="flat-input text-xs py-2 px-3"
          >
            <option value="ALL">All Classes ({quizzes.length})</option>
            {subjectCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          <button
            onClick={fetchQuizzes}
            className="flat-button-secondary text-xs py-2 px-2.5 flex items-center gap-1"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <FileQuestion className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">
            {search || filterSubject !== "ALL" ? "No matching quizzes found" : "No quizzes yet"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || filterSubject !== "ALL"
              ? "Try clearing your filters or search terms."
              : "Get started by building your first quiz."}
          </p>
          {!search && filterSubject === "ALL" && (
            <Link
              href="/teacher/quizzes/new"
              className="flat-button-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Quiz</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flat-card p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-400 transition-colors shadow-xs"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton text={quiz.subjectCode} />
                  {quiz.isPublished ? (
                    <span className="flat-badge-emerald font-semibold">Published</span>
                  ) : (
                    <span className="flat-badge-amber font-semibold">Draft</span>
                  )}
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {quiz.durationMinutes} mins
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {quiz.totalQuestions} questions ({quiz.totalPoints} pts)
                  </span>
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 text-base leading-tight">
                    {quiz.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-2xl">
                    {quiz.description || "No description provided."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>Enrolled: {quiz.enrolledCount}</span>
                  <span>•</span>
                  <span>Max Violations: {quiz.maxViolations}</span>
                  {quiz.deadlineAt && (
                    <>
                      <span>•</span>
                      <span>
                        Deadline: {new Date(quiz.deadlineAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {quiz.completedCount} / {quiz.enrolledCount} Completed
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {quiz.totalViolations > 0 ? (
                      <span className="text-rose-600 font-semibold flex items-center sm:justify-end gap-1">
                        <AlertTriangle className="w-3 h-3" /> {quiz.totalViolations} Flags
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">0 Violations</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/teacher/quizzes/${quiz.id}/edit`}
                    className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-semibold"
                    title="Edit Quiz"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>

                  <Link
                    href={`/teacher/quizzes/${quiz.id}/gradebook`}
                    className="flat-button-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                  >
                    <span>Gradebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <a
                    href={`/api/teacher/quizzes/${quiz.id}/export`}
                    download
                    className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-slate-700 font-semibold"
                    title="Download Excel Report"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline font-mono">XLSX</span>
                  </a>

                  <button
                    onClick={() => setQuizToDelete({ id: quiz.id, title: quiz.title })}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!quizToDelete}
        title="Delete Quiz Assessment"
        message={`Are you sure you want to delete '${quizToDelete?.title}'? All questions, student submissions, and grade entries will be permanently deleted.`}
        confirmText={deleting ? "Deleting..." : "Delete Quiz"}
        isDestructive={true}
        onConfirm={confirmDeleteQuiz}
        onCancel={() => setQuizToDelete(null)}
      />
    </div>
  );
}
