"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastContext";

export default function AdminFacultyApprovalsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");

  // Deletion modal
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/admin/teachers");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load faculty accounts.");
      }
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err: any) {
      setError(err.message);
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleToggleApproval = async (teacherId: string, currentApproved: boolean, teacherName: string) => {
    try {
      const res = await fetch("/api/teacher/admin/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, isApproved: !currentApproved }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      if (!currentApproved) {
        toast.success("Faculty Approved", `${teacherName} can now access WebQuiz.`);
      } else {
        toast.warning("Access Suspended", `${teacherName}'s access was suspended.`);
      }

      fetchTeachers();
    } catch (err: any) {
      toast.error("Action Failed", err.message);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/teacher/admin/teachers?id=${teacherToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete teacher.");

      toast.success("Account Removed", `${teacherToDelete.name}'s account and classes were deleted.`);
      setTeacherToDelete(null);
      fetchTeachers();
    } catch (err: any) {
      toast.error("Deletion Error", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      t.name.toLowerCase().includes(query) ||
      t.email.toLowerCase().includes(query) ||
      t.role.toLowerCase().includes(query);

    if (filterStatus === "PENDING") return matchesSearch && !t.isApproved;
    if (filterStatus === "APPROVED") return matchesSearch && t.isApproved;
    return matchesSearch;
  });

  const pendingCount = teachers.filter((t) => !t.isApproved).length;

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flat-badge-amber font-mono text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Developer Superadmin Console</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Faculty Access & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize faculty Gmail accounts to create classes and publish quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flat-card px-3 py-1.5 bg-amber-50 border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{pendingCount} Pending Approval</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by faculty name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flat-input text-xs pl-9 py-2 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                filterStatus === "ALL"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({teachers.length})
            </button>
            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                filterStatus === "PENDING"
                  ? "bg-amber-600 text-white"
                  : "text-amber-700 hover:text-amber-900"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus("APPROVED")}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                filterStatus === "APPROVED"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              Approved ({teachers.length - pendingCount})
            </button>
          </div>

          <button
            onClick={fetchTeachers}
            className="flat-button-secondary text-xs py-2 px-2.5"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Faculty Accounts Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filteredTeachers.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-sm">No faculty records found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No teachers match '${searchQuery}'.`
              : "When teachers sign in with their Google account, their profile will appear here for approval."}
          </p>
        </div>
      ) : (
        <div className="flat-card bg-white overflow-hidden border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-700">Faculty Member</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Role</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Classes Owned</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Registered On</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredTeachers.map((t) => {
                  const isSuperAdmin = t.email === "lummartin@nemsu.edu.ph";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                            {t.name?.charAt(0)?.toUpperCase() || "F"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              <CopyButton text={t.email} />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {t.role === "ADMIN" ? (
                          <span className="flat-badge-amber font-mono font-bold">SUPERADMIN</span>
                        ) : (
                          <span className="flat-badge-indigo font-mono">TEACHER</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {t.isApproved ? (
                          <span className="flat-badge-emerald font-semibold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span className="flat-badge-amber font-semibold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {t._count?.subjects || 0} class sections
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin ? (
                            <span className="text-[11px] text-slate-400 italic">Protected</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleApproval(t.id, t.isApproved, t.name)}
                                className={`text-xs py-1 px-2.5 font-bold border transition-colors ${
                                  t.isApproved
                                    ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                }`}
                              >
                                {t.isApproved ? "Revoke Access" : "Approve Faculty"}
                              </button>

                              <button
                                onClick={() => setTeacherToDelete({ id: t.id, name: t.name, email: t.email })}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete Teacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={!!teacherToDelete}
        title="Delete Teacher Account"
        message={`Are you sure you want to delete ${teacherToDelete?.name} (${teacherToDelete?.email})? All associated classes, quizzes, and rosters created by this teacher will be permanently deleted.`}
        confirmText={deleting ? "Deleting..." : "Delete Account"}
        isDestructive={true}
        onConfirm={confirmDeleteTeacher}
        onCancel={() => setTeacherToDelete(null)}
      />
    </div>
  );
}
