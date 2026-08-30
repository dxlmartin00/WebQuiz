"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  FileQuestion,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Subject deletion confirmation modal state
  const [subjectToDelete, setSubjectToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [subjectCode, setSubjectCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || !title.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/teacher/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectCode: subjectCode.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subject");

      setSubjectCode("");
      setTitle("");
      setDescription("");
      setShowModal(false);
      setSuccessMsg(`Class "${data.subject.subjectCode} - ${data.subject.title}" created successfully!`);
      fetchSubjects();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;

    setDeleting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subjectToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete class.");

      const deletedCode = subjectToDelete.subjectCode;
      setSubjectToDelete(null);
      setSuccessMsg(`Class "${deletedCode}" and all associated rosters/quizzes were deleted successfully.`);
      fetchSubjects();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Class & Roster Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create subject sections, maintain student enrollment rosters, and assign assessments.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Subject Section</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Subjects */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 font-mono">
          Loading subjects and student rosters...
        </div>
      ) : subjects.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">No classes created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create your first class/subject section to start enrolling students and creating quizzes.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flat-button-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Subject Section</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flat-card bg-white p-5 flex flex-col justify-between border border-slate-200 hover:border-slate-400 transition-colors shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flat-badge-indigo font-mono text-xs font-bold">
                    {subject.subjectCode}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subject._count?.enrollments || 0} Students</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {subject.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {subject.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-mono">
                  {subject._count?.quizzes || 0} Quizzes
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubjectToDelete(subject)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="Delete entire class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/teacher/subjects/${subject.id}`}
                    className="flat-button-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
                  >
                    <span>Manage Roster</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Subject */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="flat-card border-2 border-slate-900 bg-white max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-base">
                Create Subject Section
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subject Code *
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. CS101, CS314"
                  required
                  className="flat-input font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Computer Science"
                  required
                  className="flat-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief course objectives and summary..."
                  rows={3}
                  className="flat-input resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flat-button-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flat-button-primary text-xs py-2 px-4 font-bold"
                >
                  {submitting ? "Creating..." : "Save Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Subject */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="flat-card border-2 border-rose-600 bg-white max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Delete Class Entirely?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <b className="text-slate-900 font-mono">
                  {subjectToDelete.subjectCode} - {subjectToDelete.title}
                </b>
                ?
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium space-y-1">
              <div className="font-bold text-rose-950 uppercase tracking-wider text-[10px]">
                Permanent Cascade Action:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                <li>All <b>{subjectToDelete._count?.enrollments || 0} enrolled students</b> will be removed.</li>
                <li>All <b>{subjectToDelete._count?.quizzes || 0} assigned quizzes</b> & student submissions will be wiped.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                disabled={deleting}
                className="flat-button-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flat-button-danger text-xs py-2 px-4 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? "Deleting Class..." : "Yes, Delete Class"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
