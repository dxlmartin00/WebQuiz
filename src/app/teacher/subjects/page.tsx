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
  RefreshCw,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastContext";

export default function TeacherSubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subject deletion confirmation modal state
  const [subjectToDelete, setSubjectToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [subjectCode, setSubjectCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/subjects");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load classes");
      }
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (e: any) {
      setError(e.message);
      toast.error("Error", e.message);
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

    try {
      const res = await fetch("/api/teacher/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectCode: subjectCode.trim(),
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create class section");
      }

      toast.success("Class Created", `Subject '${subjectCode.toUpperCase()}' was created successfully.`);
      setShowModal(false);
      setSubjectCode("");
      setTitle("");
      setDescription("");
      fetchSubjects();
    } catch (e: any) {
      setError(e.message);
      toast.error("Creation Failed", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/teacher/subjects/${subjectToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete class");
      }

      toast.success("Class Deleted", `Class '${subjectToDelete.subjectCode}' and its roster were removed.`);
      setSubjectToDelete(null);
      fetchSubjects();
    } catch (e: any) {
      toast.error("Deletion Error", e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.subjectCode.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Class Rosters & Subjects</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your teaching subjects, import student ID rosters from Excel/CSV, and assign quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Class Section</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by subject code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flat-input text-xs pl-9 py-2 w-full"
          />
        </div>
        <button
          onClick={fetchSubjects}
          className="flat-button-secondary text-xs py-2 px-2.5 flex items-center gap-1"
          title="Refresh list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">
            {searchQuery ? "No matching classes found" : "No class sections yet"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No results match '${searchQuery}'. Try clear search.`
              : "Create your first subject to import student rosters and publish quizzes."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="flat-button-primary text-xs mt-4 py-2 px-4 inline-flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Class</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((s) => (
            <div
              key={s.id}
              className="flat-card p-5 bg-white flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CopyButton text={s.subjectCode} />
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="font-bold text-slate-900 text-base leading-tight">
                  {s.title}
                </h2>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {s.description || "No description provided."}
                </p>
              </div>

              {/* Stats & Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{s._count.enrollments} Students</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <FileQuestion className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s._count.quizzes} Quizzes</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSubjectToDelete(s)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/teacher/subjects/${s.id}`}
                    className="flat-button-primary text-xs py-1.5 px-2.5 flex items-center gap-1 font-bold"
                  >
                    <span>Manage Roster</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Subject */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md bg-white border-2 border-slate-900 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Create New Class Section
            </h2>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., CS101, IT202-BSIT3A"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  required
                  className="flat-input text-xs uppercase font-mono w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Class / Subject Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures and Algorithms"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="flat-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Schedule (Optional)
                </label>
                <textarea
                  placeholder="e.g., MWF 9:00 AM - 10:30 AM (Room Lab 3)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="flat-input text-xs w-full"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flat-button-secondary text-xs py-2 px-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flat-button-primary text-xs py-2 px-4 font-bold"
                >
                  {submitting ? "Creating..." : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Subject */}
      <ConfirmModal
        isOpen={!!subjectToDelete}
        title="Delete Class Section"
        message={`Are you sure you want to delete '${subjectToDelete?.subjectCode}' (${subjectToDelete?.title})? This will permanently delete all associated student rosters, quizzes, and submission records.`}
        confirmText={deleting ? "Deleting..." : "Delete Class"}
        isDestructive={true}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setSubjectToDelete(null)}
      />
    </div>
  );
}
