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
  X,
} from "lucide-react";

export default function QuizGradebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

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

  const filteredSubmissions = submissions.filter(
    (s: any) =>
      s.studentIdNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.studentName.toLowerCase().includes(search.toLowerCase())
  );

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

        <div className="flat-card p-5 border-l-4 border-l-rose-600 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Integrity Violations
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2">
            {stats.totalViolations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across all student attempts
          </div>
        </div>

        <div className="flat-card p-5 border-l-4 border-l-amber-500 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Strike Threshold
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {quiz.maxViolations}{" "}
            <span className="text-sm font-normal text-slate-500">strikes max</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Auto-submit on limit reached
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Enrolled Student Scorecard
          </h2>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student ID or name..."
            className="flat-input text-xs sm:w-64 py-1.5"
          />
        </div>

        <div className="flat-card bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Violations</th>
                <th className="px-4 py-3">Submitted At</th>
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
                      {s.hasSubmitted ? (
                        <button
                          onClick={() => setSelectedSubmission(s)}
                          className="flat-button-secondary text-xs py-1 px-2.5 flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Review</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
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
    </div>
  );
}
