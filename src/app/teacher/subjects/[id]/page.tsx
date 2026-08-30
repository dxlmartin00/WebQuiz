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
  Search,
  RefreshCw,
} from "lucide-react";
import ClassListImportModal from "@/components/teacher/ClassListImportModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastContext";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single Add form
  const [singleId, setSingleId] = useState("");
  const [singleName, setSingleName] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);

  // Smart Class List Importer Modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Subject Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState(false);

  // Student removal confirmation
  const [studentToDelete, setStudentToDelete] = useState<{ idNumber: string; name: string } | null>(null);
  const [removingStudent, setRemovingStudent] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubject = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/teacher/subjects/${id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load class details");
      }
      const data = await res.json();
      setSubject(data.subject);
    } catch (e: any) {
      setError(e.message);
      toast.error("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleId.trim() || !singleName.trim()) return;

    setAddingSingle(true);

    try {
      const res = await fetch(`/api/teacher/subjects/${id}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: [
            {
              studentIdNumber: singleId.trim(),
              studentName: singleName.trim(),
            },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add student");
      }

      toast.success("Student Enrolled", `${singleName.trim()} (${singleId.trim()}) added to roster.`);
      setSingleId("");
      setSingleName("");
      fetchSubject();
    } catch (e: any) {
      toast.error("Enrollment Error", e.message);
    } finally {
      setAddingSingle(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return;
    setRemovingStudent(true);

    try {
      const res = await fetch(`/api/teacher/subjects/${id}/roster`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIdNumber: studentToDelete.idNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove student");
      }

      toast.success("Student Removed", `${studentToDelete.name} was removed from this roster.`);
      setStudentToDelete(null);
      fetchSubject();
    } catch (e: any) {
      toast.error("Removal Error", e.message);
    } finally {
      setRemovingStudent(false);
    }
  };

  const handleDeleteSubject = async () => {
    setDeletingSubject(true);

    try {
      const res = await fetch(`/api/teacher/subjects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete subject");
      }

      toast.success("Class Deleted", "Class and roster deleted.");
      router.push("/teacher/subjects");
    } catch (e: any) {
      toast.error("Deletion Error", e.message);
      setDeletingSubject(false);
    }
  };

  if (loading && !subject) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{error || "Subject not found"}</span>
          <Link href="/teacher/subjects" className="flat-button-secondary text-xs py-1 px-2.5">
            &larr; Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  const enrollments = subject.enrollments || [];
  const filteredEnrollments = enrollments.filter((e: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.studentIdNumber.toLowerCase().includes(q) ||
      e.studentName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Link
            href="/teacher/subjects"
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Classes
          </Link>
          <div className="flex items-center gap-2.5">
            <CopyButton text={subject.subjectCode} />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {subject.title}
            </h1>
          </div>
          {subject.description && (
            <p className="text-xs text-slate-500 mt-1">{subject.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Class List</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors"
            title="Delete Class"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Roster & Quick Add Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Student Roster Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Enrolled Students ({enrollments.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Only students listed below are authorized to take quizzes in this subject.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flat-input text-xs pl-8 py-1.5 w-full"
              />
            </div>
          </div>

          {enrollments.length === 0 ? (
            <div className="flat-card p-10 text-center bg-white border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 text-sm">No students enrolled yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Use the spreadsheet importer or add students manually using the form on the right.
              </p>
            </div>
          ) : (
            <div className="flat-card bg-white overflow-hidden border border-slate-200 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700">#</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Student ID</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Full Name</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Enrolled On</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredEnrollments.map((e: any, idx: number) => (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 font-sans">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-indigo-700">
                          <CopyButton text={e.studentIdNumber} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-900 font-sans font-medium">
                          {e.studentName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-sans">
                          <button
                            onClick={() =>
                              setStudentToDelete({
                                idNumber: e.studentIdNumber,
                                name: e.studentName,
                              })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Manual Student Entry Form */}
        <div className="space-y-4">
          <div className="flat-card p-5 bg-white space-y-4 border border-slate-200">
            <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Enroll Single Student</span>
            </h2>

            <form onSubmit={handleAddSingleStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student ID Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2023-10492"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  required
                  className="flat-input text-xs font-mono uppercase w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Juan Dela Cruz"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  required
                  className="flat-input text-xs w-full"
                />
              </div>

              <button
                type="submit"
                disabled={addingSingle}
                className="flat-button-primary text-xs w-full py-2 font-bold"
              >
                {addingSingle ? "Adding Student..." : "Add to Roster"}
              </button>
            </form>
          </div>

          <div className="flat-card p-5 bg-indigo-50/60 border border-indigo-100 space-y-2">
            <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Batch Roster Import</span>
            </h3>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Have an official NEMSU class list or Excel file? Upload it directly with our smart column detector.
            </p>
            <button
              onClick={() => setShowImportModal(true)}
              className="flat-button-primary text-xs w-full py-1.5 mt-2 font-bold"
            >
              Open Class List Importer
            </button>
          </div>
        </div>
      </div>

      {/* Class List Import Modal */}
      <ClassListImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        subjectId={id}
        subjectCode={subject.subjectCode}
        existingEnrollments={enrollments}
        onSuccess={(count) => {
          toast.success("Roster Imported", `${count} students successfully enrolled into ${subject.subjectCode}.`);
          fetchSubject();
        }}
      />

      {/* Confirmation: Remove Single Student */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Remove Student from Roster"
        message={`Are you sure you want to remove ${studentToDelete?.name} (${studentToDelete?.idNumber}) from this class?`}
        confirmText={removingStudent ? "Removing..." : "Remove Student"}
        isDestructive={true}
        onConfirm={handleRemoveStudent}
        onCancel={() => setStudentToDelete(null)}
      />

      {/* Confirmation: Delete Subject */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Entire Class Section"
        message={`Are you sure you want to delete '${subject.subjectCode}' (${subject.title})? All student enrollments, quizzes, and grade records will be permanently deleted.`}
        confirmText={deletingSubject ? "Deleting..." : "Delete Class"}
        isDestructive={true}
        onConfirm={handleDeleteSubject}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
