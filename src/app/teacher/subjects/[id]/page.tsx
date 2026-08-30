"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  FileQuestion,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import ClassListImportModal from "@/components/teacher/ClassListImportModal";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single Add form
  const [singleId, setSingleId] = useState("");
  const [singleName, setSingleName] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);

  // Smart Class List Importer Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Subject Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubject = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/subjects/${id}`);
      if (!res.ok) throw new Error("Failed to load subject details");
      const data = await res.json();
      setSubject(data.subject);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleId.trim()) return;

    setAddingSingle(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${id}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIdNumber: singleId.trim().toUpperCase(),
          studentName: singleName.trim() || "Student",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student");

      setSingleId("");
      setSingleName("");
      setSuccessMsg(`Enrolled student ${singleId.toUpperCase()} successfully.`);
      fetchSubject();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingSingle(false);
    }
  };

  const handleRemoveStudent = async (studentIdNumber: string) => {
    if (!confirm(`Are you sure you want to remove ${studentIdNumber} from this class roster?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/teacher/subjects/${id}/roster?studentIdNumber=${encodeURIComponent(studentIdNumber)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove student");
      fetchSubject();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteSubjectEntirely = async () => {
    setDeletingSubject(true);
    setError(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete subject.");

      router.push("/teacher/subjects");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setDeletingSubject(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono">
        Loading class details and roster...
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-8 text-center text-sm text-rose-600">
        Subject section not found.
      </div>
    );
  }

  const filteredEnrollments = (subject.enrollments || []).filter(
    (e: any) =>
      e.studentIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Back link & Header */}
      <div className="space-y-4 pb-6 border-b border-slate-200">
        <Link
          href="/teacher/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classes</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flat-badge-indigo font-mono text-xs">
                {subject.subjectCode}
              </span>
              <span className="text-xs text-slate-500">
                {subject.enrollments?.length || 0} Enrolled Students
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {subject.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {subject.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowImportModal(true)}
              className="flat-button-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-xs hover:border-indigo-600"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Upload Class List (.xlsx, .csv)</span>
            </button>

            <Link
              href="/teacher/quizzes/new"
              className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Quiz</span>
            </Link>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flat-button-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-rose-600 hover:border-rose-300 hover:bg-rose-50 font-semibold"
              title="Delete entire class"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Class</span>
            </button>
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Enrolled Students Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Enrolled Student Roster</span>
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID or Student Name..."
                className="flat-input text-xs sm:w-64 py-1.5"
              />
            </div>
          </div>

          <div className="flat-card bg-white border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Enrolled Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No students enrolled matching search criteria. Use the "Upload Class List" button above to import your roster.
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enrolled: any, index: number) => (
                    <tr key={enrolled.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {enrolled.studentIdNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">
                        {enrolled.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(enrolled.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveStudent(enrolled.studentIdNumber)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove Student from Roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add Individual Student & Assigned Quizzes */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Add Form */}
          <div className="flat-card bg-white p-5 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Enroll Single Student</span>
            </h3>

            <form onSubmit={handleAddSingle} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Student ID Number *
                </label>
                <input
                  type="text"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  placeholder="e.g. 1006261 or STU-1001"
                  required
                  className="flat-input font-mono uppercase text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="e.g. AGUDO, FRAGILE JOHN C."
                  className="flat-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={addingSingle}
                className="flat-button-dark w-full text-xs py-2 mt-2 font-bold"
              >
                {addingSingle ? "Enrolling..." : "Add to Roster"}
              </button>
            </form>
          </div>

          {/* Assigned Quizzes under this subject */}
          <div className="flat-card bg-white p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-slate-600" />
                <span>Class Quizzes ({subject.quizzes?.length || 0})</span>
              </h3>
              <Link
                href="/teacher/quizzes/new"
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                + New
              </Link>
            </div>

            <div className="space-y-2">
              {subject.quizzes?.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No quizzes assigned yet.
                </div>
              ) : (
                subject.quizzes?.map((q: any) => (
                  <Link
                    key={q.id}
                    href={`/teacher/quizzes/${q.id}/gradebook`}
                    className="block p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {q.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                      <span>{q._count?.questions || 0} questions</span>
                      <span>{q._count?.submissions || 0} submissions</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Class List Excel/CSV Import & Review Modal */}
      <ClassListImportModal
        subjectId={subject.id}
        subjectCode={subject.subjectCode}
        existingEnrollments={subject.enrollments || []}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(count) => {
          setSuccessMsg(`Successfully imported and enrolled ${count} students into the class roster!`);
          fetchSubject();
        }}
      />

      {/* Subject Deletion Modal */}
      {showDeleteModal && (
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
                  {subject.subjectCode} - {subject.title}
                </b>
                ?
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium space-y-1">
              <div className="font-bold text-rose-950 uppercase tracking-wider text-[10px]">
                Permanent Cascade Action:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                <li>All <b>{subject.enrollments?.length || 0} enrolled students</b> will be removed.</li>
                <li>All <b>{subject.quizzes?.length || 0} quizzes</b> and student exam submissions will be deleted.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingSubject}
                className="flat-button-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubjectEntirely}
                disabled={deletingSubject}
                className="flat-button-danger text-xs py-2 px-4 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingSubject ? "Deleting Class..." : "Yes, Delete Class"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
