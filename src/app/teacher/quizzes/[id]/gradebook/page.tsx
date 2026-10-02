"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Eye,
  FileSpreadsheet,
  Award,
  RefreshCw,
  RotateCcw,
  X,
  ArrowUpDown,
  TrendingUp,
  Filter,
  BarChart3,
  Radio,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { LiveExamMonitor } from "@/components/teacher/LiveExamMonitor";
import { ItemAnalysisView } from "@/components/teacher/ItemAnalysisView";

export default function QuizGradebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("studentName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [resettingStudent, setResettingStudent] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<"ROSTER" | "LIVE_MONITOR" | "ITEM_ANALYSIS">("ROSTER");

  const fetchGradebook = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/quizzes/${id}/submissions`);
      if (!res.ok) throw new Error("Failed to fetch gradebook");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAttempt = async (student: any) => {
    if (!student) return;
    try {
      setIsResetting(true);
      const res = await fetch(`/api/teacher/quizzes/${id}/submissions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIdNumber: student.studentIdNumber,
          submissionId: student.submissionId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset student attempt");

      toast.success(
        "Attempt Reset",
        `${student.studentName}'s attempt was cleared. They can now re-take this quiz.`
      );
      setResettingStudent(null);
      if (selectedSubmission?.studentIdNumber === student.studentIdNumber) {
        setSelectedSubmission(null);
      }
      fetchGradebook();
    } catch (err: any) {
      toast.error("Reset Failed", err.message);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchGradebook();
  }, [id]);

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono">
        Loading live gradebook and violation telemetry...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-rose-600">
        Quiz record not found.
      </div>
    );
  }

  const { quiz, stats, submissions } = data;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const rawSubmissions: any[] = submissions || [];
  const submittedItems = rawSubmissions.filter((s: any) => s.hasSubmitted);
  const scores = submittedItems.map((s: any) => s.score);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passingCount = submittedItems.filter((s: any) => (s.percentage || 0) >= 75).length;
  const passRate =
    submittedItems.length > 0 ? ((passingCount / submittedItems.length) * 100).toFixed(0) : "0";

  const countSubmitted = rawSubmissions.filter((s: any) => s.hasSubmitted).length;
  const countInProgress = rawSubmissions.filter((s: any) => s.status === "IN_PROGRESS").length;
  const countNotStarted = rawSubmissions.filter((s: any) => s.status === "NOT_STARTED" || !s.status).length;
  const countFlagged = rawSubmissions.filter((s: any) => s.violationCount > 0).length;

  const filteredSubmissions = rawSubmissions
    .filter((s: any) => {
      const matchSearch =
        s.studentIdNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.studentName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === "SUBMITTED") return s.hasSubmitted;
      if (statusFilter === "IN_PROGRESS") return s.status === "IN_PROGRESS";
      if (statusFilter === "NOT_STARTED") return s.status === "NOT_STARTED" || !s.status;
      if (statusFilter === "FLAGGED") return s.violationCount > 0;
      return true;
    })
    .sort((a: any, b: any) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "score" || sortField === "percentage" || sortField === "violationCount") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else if (sortField === "submittedAt") {
        valA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        valB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
      {/* Back and Actions */}
      <div className="space-y-4 pb-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <Link
            href="/teacher/quizzes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Quizzes</span>
          </Link>

          <button
            onClick={fetchGradebook}
            className="flat-button-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Refresh Live Submissions"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flat-badge-indigo font-mono text-xs font-bold">
                {quiz.subjectCode}
              </span>
              <span className="text-xs text-slate-500">{quiz.subjectTitle}</span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500">{quiz.totalPoints} Total Points</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {quiz.title} - Gradebook & Integrity Audit
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/quizzes/${id}/edit`}
              className="flat-button-secondary text-xs py-2 px-3"
            >
              Edit Quiz Settings
            </Link>

            <a
              href={`/api/teacher/quizzes/${id}/export`}
              download
              className="flat-button-primary text-xs py-2 px-4 flex items-center gap-2 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 font-bold"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Gradebook (.xlsx)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("ROSTER")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "ROSTER"
              ? "border-slate-900 text-slate-900 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Student Gradebook Roster</span>
        </button>

        <button
          onClick={() => setActiveTab("LIVE_MONITOR")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "LIVE_MONITOR"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Radio className="w-4 h-4 text-indigo-600" />
          <span>Live Exam Monitor</span>
          {countInProgress > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {countInProgress} active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ITEM_ANALYSIS")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "ITEM_ANALYSIS"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Item Analysis & Diagnostics</span>
        </button>
      </div>

      {activeTab === "ROSTER" && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flat-card p-5 border-l-4 border-l-slate-900 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Submissions / Enrolled
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {stats.submittedCount} / {stats.enrolledTotal}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.enrolledTotal > 0
              ? `${((stats.submittedCount / stats.enrolledTotal) * 100).toFixed(0)}% Completion Rate`
              : "0%"}
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-indigo-600 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Average Score
          </div>
          <div className="text-3xl font-black text-indigo-600 mt-2">
            {stats.averageScore.toFixed(1)}{" "}
            <span className="text-sm font-normal text-slate-500">
              / {quiz.totalPoints}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {quiz.totalPoints > 0
              ? `${((stats.averageScore / quiz.totalPoints) * 100).toFixed(1)}% Mean Grade`
              : "0%"}
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-emerald-600 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Score Range & Pass Rate
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
            {highestScore} <span className="text-xs text-slate-500 font-sans font-normal">high</span> / {lowestScore} <span className="text-xs text-slate-500 font-sans font-normal">low</span>
          </div>
          <div className="text-[11px] text-emerald-800 mt-1 font-semibold">
            {passRate}% Passing (&ge; 75%)
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-rose-600 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Integrity Violations
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2">
            {stats.totalViolations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Limit: {quiz.maxViolations} strikes before auto-submit
          </div>
        </div>
      </div>

      {/* Gradebook Table Controls & Scorecard */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Enrolled Student Scorecard
            </h2>
            <p className="text-xs text-slate-500">
              Click table headers to sort by score, name, or violation strikes.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student ID or name..."
              className="flat-input text-xs sm:w-64 pl-8 py-1.5"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
          {[
            { key: "ALL", label: `All (${rawSubmissions.length})` },
            { key: "SUBMITTED", label: `Submitted (${countSubmitted})` },
            { key: "IN_PROGRESS", label: `In Progress (${countInProgress})` },
            { key: "NOT_STARTED", label: `Not Started (${countNotStarted})` },
            { key: "FLAGGED", label: `Flagged Strikes (${countFlagged})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`text-xs px-2.5 py-1 font-bold transition-all border ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flat-card bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort("studentIdNumber")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Student ID</span>
                    {sortField === "studentIdNumber" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("studentName")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {sortField === "studentName" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Status</th>
                <th
                  onClick={() => handleSort("score")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Score</span>
                    {sortField === "score" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("percentage")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Percentage</span>
                    {sortField === "percentage" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("violationCount")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Violations</span>
                    {sortField === "violationCount" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("submittedAt")}
                  className="px-4 py-3 cursor-pointer hover:text-indigo-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Submitted At</span>
                    {sortField === "submittedAt" && (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No student records found.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s: any) => (
                  <tr key={s.studentIdNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {s.studentIdNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.studentName}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "SUBMITTED" ? (
                        <span className="flat-badge-emerald">Submitted</span>
                      ) : s.status === "AUTO_SUBMITTED" ? (
                        <span className="flat-badge-amber">Auto-Submitted</span>
                      ) : s.status === "IN_PROGRESS" ? (
                        <span className="flat-badge-indigo">In Progress</span>
                      ) : (
                        <span className="flat-badge-slate">Not Started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {s.hasSubmitted ? `${s.score} / ${s.totalPoints}` : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {s.hasSubmitted ? `${s.percentage.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {s.violationCount > 0 ? (
                        <span className="flat-badge-rose flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{s.violationCount} Strikes</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {s.submittedAt
                        ? new Date(s.submittedAt).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.hasSubmitted && (
                          <button
                            onClick={() => setSelectedSubmission(s)}
                            className="flat-button-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                            title="Review question answers & audit log"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Review</span>
                          </button>
                        )}
                        {s.status !== "NOT_STARTED" && (
                          <button
                            onClick={() => setResettingStudent(s)}
                            className="border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs py-1 px-2.5 flex items-center gap-1 transition-colors"
                            title="Reset student attempt (allow re-take)"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset</span>
                          </button>
                        )}
                        {s.status === "NOT_STARTED" && (
                          <span className="text-slate-400 text-[11px]">-</span>
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
      </>
      )}

      {activeTab === "LIVE_MONITOR" && (
        <LiveExamMonitor
          quiz={quiz}
          submissions={rawSubmissions}
          onRefresh={fetchGradebook}
          onResetAttempt={(s) => setResettingStudent(s)}
          onViewReview={(s) => setSelectedSubmission(s)}
        />
      )}

      {activeTab === "ITEM_ANALYSIS" && (
        <ItemAnalysisView quiz={quiz} submissions={rawSubmissions} />
      )}

      {/* Submission Review Drawer/Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="flat-card border-2 border-slate-900 bg-white max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5">
                    {selectedSubmission.studentIdNumber}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedSubmission.studentName}
                  </h3>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span>Score: <b className="text-slate-900">{selectedSubmission.score} / {selectedSubmission.totalPoints}</b> ({selectedSubmission.percentage.toFixed(1)}%)</span>
                  <span>&bull;</span>
                  <span>Violations: <b className="text-rose-600">{selectedSubmission.violationCount}</b></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Integrity Audit Log */}
              {selectedSubmission.violationLogs?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Cheating & Integrity Log Timeline</span>
                  </h4>
                  <div className="bg-rose-50/50 border border-rose-200 divide-y divide-rose-100 text-xs">
                    {selectedSubmission.violationLogs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-start justify-between gap-4">
                        <div>
                          <span className="font-bold text-rose-900 font-mono uppercase text-[11px]">
                            [{log.eventType}]
                          </span>{" "}
                          <span className="text-rose-800">{log.details}</span>
                        </div>
                        <span className="text-[11px] font-mono text-rose-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question-by-Question Evaluation
                </h4>

                <div className="space-y-3">
                  {selectedSubmission.answers?.map((ans: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 border ${
                        ans.isCorrect
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800">
                          Q{idx + 1}. {ans.prompt}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            ans.isCorrect ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          +{ans.pointsAwarded} pts
                        </span>
                      </div>

                      <div className="text-xs space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Student Answer:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {ans.studentAnswer || "(No Answer Given)"}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border ${
                              ans.matchType === "EXACT"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : ans.matchType === "SYNONYM"
                                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                                : ans.matchType === "FUZZY"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-rose-100 text-rose-800 border-rose-300"
                            }`}
                          >
                            {ans.matchType || (ans.isCorrect ? "CORRECT" : "INCORRECT")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setResettingStudent(selectedSubmission)}
                className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold transition-colors"
                title="Clear submission and allow student to re-take"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Reset Student Attempt</span>
              </button>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="flat-button-dark text-xs py-1.5 px-4"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Attempt Confirmation Modal */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="flat-card border-2 border-slate-900 bg-white max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-none">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reset Student Attempt?</h3>
                <p className="text-xs text-slate-500">Academic Consideration / Retake Authorization</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 border border-slate-200 font-sans">
              <p className="text-slate-500">You are about to reset the examination attempt for:</p>
              <div className="font-bold text-slate-900 text-sm">
                {resettingStudent.studentName}
              </div>
              <div className="font-mono text-indigo-700 text-xs font-semibold">
                Student ID: {resettingStudent.studentIdNumber}
              </div>
            </div>

            <div className="text-[11px] text-amber-950 bg-amber-50/80 p-3.5 border border-amber-200 space-y-1 leading-relaxed">
              <p className="font-bold text-amber-900">What happens when you reset:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Current score ({resettingStudent.score ?? 0} pts) and answers will be cleared.</li>
                <li>Violation strikes ({resettingStudent.violationCount ?? 0} strikes) will be wiped clean.</li>
                <li>The student's status will return to <b>Active</b> with a fresh timer, allowing them to re-take the exam.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResettingStudent(null)}
                disabled={isResetting}
                className="flat-button-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResetAttempt(resettingStudent)}
                disabled={isResetting}
                className="flat-button-primary bg-amber-600 border-amber-700 hover:bg-amber-700 text-white text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                <span>{isResetting ? "Resetting..." : "Confirm & Reset Attempt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
