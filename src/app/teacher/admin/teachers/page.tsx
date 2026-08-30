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
} from "lucide-react";

export default function AdminFacultyApprovalsPage() {
  const { data: session } = useSession();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teacher/admin/teachers");
      if (!res.ok) throw new Error("Failed to load faculty accounts.");
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleToggleApproval = async (teacherId: string, currentApproved: boolean) => {
    try {
      setError(null);
      setSuccessMsg(null);

      const res = await fetch("/api/teacher/admin/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, isApproved: !currentApproved }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setSuccessMsg(
        !currentApproved
          ? `Faculty account approved! They can now access WebQuiz.`
          : `Faculty account access has been revoked.`
      );
      fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTeacher = async (teacher: any) => {
    if (
      !confirm(
        `Are you sure you want to delete ${teacher.name} (${teacher.email})? This will delete all classes and quizzes they created.`
      )
    ) {
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/teacher/admin/teachers?teacherId=${teacher.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete teacher.");

      setSuccessMsg(`Teacher account ${teacher.email} removed.`);
      fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pendingCount = teachers.filter((t) => !t.isApproved).length;
  const approvedCount = teachers.filter((t) => t.isApproved).length;

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === "PENDING") return matchesSearch && !t.isApproved;
    if (filterStatus === "APPROVED") return matchesSearch && t.isApproved;
    return matchesSearch;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flat-badge-amber font-mono text-xs font-bold">
              Developer Administration
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Security & Whitelisting
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Faculty Access &amp; Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize or revoke faculty accounts signing in via Google. Unapproved teachers cannot view or create quizzes.
          </p>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flat-card bg-white p-5 border border-slate-200">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            Total Registered Faculty
          </div>
          <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
            {teachers.length}
          </div>
        </div>

        <div className="flat-card bg-amber-50 p-5 border border-amber-200">
          <div className="text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Authorization</span>
          </div>
          <div className="text-3xl font-black text-amber-900 mt-1 font-mono">
            {pendingCount}
          </div>
        </div>

        <div className="flat-card bg-emerald-50 p-5 border border-emerald-200">
          <div className="text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active & Approved</span>
          </div>
          <div className="text-3xl font-black text-emerald-900 mt-1 font-mono">
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 font-bold border transition-colors ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({teachers.length})
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`px-3 py-1.5 font-bold border transition-colors ${
              filterStatus === "PENDING"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("APPROVED")}
            className={`px-3 py-1.5 font-bold border transition-colors ${
              filterStatus === "APPROVED"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or university email..."
            className="flat-input text-xs pl-8 py-1.5 w-full sm:w-72"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <div className="flat-card bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Faculty Member</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-mono">
                  Loading faculty accounts...
                </td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No faculty accounts found matching filter.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.name}
                          className="w-7 h-7 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {teacher.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-slate-900">{teacher.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-600">
                    {teacher.email}
                  </td>

                  <td className="px-4 py-3">
                    {teacher.role === "ADMIN" ? (
                      <span className="flat-badge-amber text-[10px] font-bold">
                        Developer / Admin
                      </span>
                    ) : (
                      <span className="flat-badge-indigo text-[10px]">
                        Teacher
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-700">
                    {teacher._count?.subjects || 0} classes
                  </td>

                  <td className="px-4 py-3">
                    {teacher.isApproved ? (
                      <span className="flat-badge-emerald text-[10px] flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved</span>
                      </span>
                    ) : (
                      <span className="flat-badge-amber text-[10px] flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        <span>Pending Approval</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {teacher.role !== "ADMIN" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleApproval(teacher.id, teacher.isApproved)}
                            className={`text-xs py-1 px-2.5 font-bold border transition-colors flex items-center gap-1 ${
                              teacher.isApproved
                                ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                                : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                            }`}
                          >
                            {teacher.isApproved ? (
                              <>
                                <UserX className="w-3 h-3 text-slate-500" />
                                <span>Revoke</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Approve Access</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
