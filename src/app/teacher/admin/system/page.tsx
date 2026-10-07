"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  Users,
  Database,
  FileQuestion,
  ShieldAlert,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminSystemMonitorPage() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Filter & Selected error for modal
  const [errorFilter, setErrorFilter] = useState<"ALL" | "500" | "CLIENT">("ALL");
  const [selectedError, setSelectedError] = useState<any>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  const fetchTelemetry = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const res = await fetch("/api/teacher/admin/system");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load telemetry data.");
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message);
      if (!silent) toast.error("Diagnostics Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  // Optional 30-second auto-refresh when toggled on by admin
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClearLogs = async () => {
    try {
      setClearingLogs(true);
      const res = await fetch("/api/teacher/admin/system", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear error logs.");
      toast.success("Logs Cleared", "All recorded system errors were purged.");
      setShowClearModal(false);
      fetchTelemetry(true);
    } catch (err: any) {
      toast.error("Action Failed", err.message);
    } finally {
      setClearingLogs(false);
    }
  };

  const recentLogs: any[] = data?.errors?.recentLogs || [];
  const filteredLogs = recentLogs.filter((log) => {
    if (errorFilter === "500") return log.statusCode >= 500;
    if (errorFilter === "CLIENT") return log.statusCode < 500;
    return true;
  });

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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>System Health &amp; Telemetry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time exam traffic load, database round-trip latency, and zero-overhead API error auditing.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-2 cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded-none border-slate-300"
            />
            <span>Auto-refresh (30s)</span>
          </label>

          <button
            onClick={() => fetchTelemetry(true)}
            disabled={refreshing}
            className="flat-button-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Checking..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <Link
          href="/teacher/admin/teachers"
          className="flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>Faculty Access &amp; Approvals</span>
        </Link>
        <Link
          href="/teacher/admin/system"
          className="flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 border-slate-900 text-slate-900 bg-white transition-colors"
        >
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>System Health &amp; Logs</span>
        </Link>
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono space-y-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <span>GATHERING CLUSTER TELEMETRY &amp; LOAD METRICS...</span>
        </div>
      ) : error && !data ? (
        <div className="flat-card p-6 bg-rose-50 border-rose-300 text-rose-900 text-xs">
          <p className="font-bold">Error loading system diagnostics</p>
          <p className="mt-1 font-mono text-[11px]">{error}</p>
        </div>
      ) : (
        <>
          {/* Top Diagnostics Status Banner */}
          <div className="flat-card bg-white p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Database:</span>
                <span className="flat-badge-emerald font-mono font-bold text-[11px]">
                  TiDB Cloud (ap-southeast-1)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">DB Latency:</span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                    data?.health?.dbLatencyMs < 200
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : data?.health?.dbLatencyMs < 500
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                >
                  {data?.health?.dbLatencyMs} ms ({data?.health?.status})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">Serverless Runtime:</span>
                <span className="text-xs font-mono text-slate-600 font-semibold">
                  Vercel Edge &amp; Node.js
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 self-end md:self-auto">
              Telemetry sample: {lastRefreshed.toLocaleTimeString()}
            </div>
          </div>

          {/* Traffic & Concurrency KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Test-Takers */}
            <div className="flat-card p-5 border-l-4 border-l-emerald-600 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Test-Takers
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono flex items-baseline gap-2">
                <span>{data?.traffic?.activeConcurrentTestTakers || 0}</span>
                <span className="text-xs text-slate-500 font-normal">students online</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Actively answering unexpired exams right now
              </p>
            </div>

            {/* Submissions in Last 24 Hours */}
            <div className="flat-card p-5 border-l-4 border-l-indigo-600 bg-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Submissions (24h)
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {data?.traffic?.submissions24h || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed or auto-submitted today ({data?.traffic?.submissions7d || 0} in 7d)
              </p>
            </div>

            {/* Active Quizzes */}
            <div className="flat-card p-5 border-l-4 border-l-amber-600 bg-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Open Quizzes
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {data?.traffic?.liveQuizzes || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Published &amp; within schedule window
              </p>
            </div>

            {/* Total System Errors */}
            <div className="flat-card p-5 border-l-4 border-l-rose-600 bg-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recorded Errors
              </span>
              <div className="text-2xl font-black text-rose-600 mt-2 font-mono flex items-baseline gap-2">
                <span>{data?.errors?.totalErrors || 0}</span>
                <span className="text-xs text-slate-500 font-normal">
                  ({data?.errors?.serverErrors500 || 0} critical 500s)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Logged API exceptions &amp; submit failures
              </p>
            </div>
          </div>

          {/* Active Exam Rooms Breakdown */}
          {data?.traffic?.activeRooms?.length > 0 && (
            <div className="flat-card bg-white p-5 border border-slate-200 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-emerald-600" />
                <span>Live Quiz Rooms Currently in Progress</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.traffic.activeRooms.map((room: any) => (
                  <div
                    key={room.quizId}
                    className="p-3 border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 border border-indigo-200">
                        {room.subjectCode}
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate mt-1">
                        {room.title}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                        {room.count} {room.count === 1 ? "student" : "students"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error & Exception Log Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>API Errors &amp; Failure Log</span>
                </h2>
                <span className="text-xs font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  {filteredLogs.length} shown
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Buttons */}
                <div className="flex items-center border border-slate-200 bg-white">
                  <button
                    onClick={() => setErrorFilter("ALL")}
                    className={`text-xs px-2.5 py-1 font-bold transition-colors ${
                      errorFilter === "ALL"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({recentLogs.length})
                  </button>
                  <button
                    onClick={() => setErrorFilter("500")}
                    className={`text-xs px-2.5 py-1 font-bold transition-colors ${
                      errorFilter === "500"
                        ? "bg-rose-600 text-white"
                        : "text-slate-600 hover:text-rose-700"
                    }`}
                  >
                    500 Server Errors ({recentLogs.filter((l) => l.statusCode >= 500).length})
                  </button>
                  <button
                    onClick={() => setErrorFilter("CLIENT")}
                    className={`text-xs px-2.5 py-1 font-bold transition-colors ${
                      errorFilter === "CLIENT"
                        ? "bg-amber-600 text-white"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                  >
                    4xx Client Errors ({recentLogs.filter((l) => l.statusCode < 500).length})
                  </button>
                </div>

                {recentLogs.length > 0 && (
                  <button
                    onClick={() => setShowClearModal(true)}
                    className="flat-button-secondary text-xs py-1 px-2.5 text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Errors Table */}
            <div className="flat-card bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Method &amp; Endpoint</th>
                    <th className="px-4 py-3">User Role &amp; ID</th>
                    <th className="px-4 py-3">Error Message</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="font-bold text-slate-700">No system errors recorded</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          The system is operating cleanly without recorded exceptions.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                          {new Date(log.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 border ${
                              log.statusCode >= 500
                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                            }`}
                          >
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-900 font-bold">
                          <span className="text-slate-500 mr-1.5">{log.method}</span>
                          <span>{log.endpoint}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {log.userId ? (
                            <span className="font-mono text-xs font-semibold">
                              {log.userId}{" "}
                              <span className="text-[10px] text-slate-400">({log.userRole})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800 max-w-xs truncate font-mono text-[11px]">
                          {log.errorMessage}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedError(log)}
                            className="flat-button-secondary text-[11px] py-1 px-2.5 font-bold"
                          >
                            Inspect
                          </button>
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

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs animate-in fade-in">
          <div className="flat-card bg-white max-w-2xl w-full border-2 border-slate-900 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 border ${
                    selectedError.statusCode >= 500
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  HTTP {selectedError.statusCode}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedError.method} {selectedError.endpoint}
                </span>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-slate-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs font-sans">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Timestamp &amp; User Context
                </span>
                <p className="font-mono text-slate-800 mt-0.5">
                  {new Date(selectedError.createdAt).toISOString()} &bull; User:{" "}
                  <strong>{selectedError.userId || "Anonymous"}</strong> ({selectedError.userRole})
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Error Message
                </span>
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 font-mono text-[11px] whitespace-pre-wrap rounded-none mt-1">
                  {selectedError.errorMessage}
                </div>
              </div>

              {selectedError.stackTrace && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Stack Trace
                  </span>
                  <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-[10px] overflow-x-auto rounded-none mt-1 max-h-60 leading-relaxed">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedError(null)}
                className="flat-button-primary text-xs py-2 px-4 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Logs Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Purge System Error Logs"
        message="Are you sure you want to delete all recorded error logs? This will clean up the error history table."
        confirmText={clearingLogs ? "Purging..." : "Yes, Purge Logs"}
        isDestructive={true}
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
