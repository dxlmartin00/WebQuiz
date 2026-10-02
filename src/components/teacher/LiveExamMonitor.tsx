"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  RotateCcw,
  Eye,
  Wifi,
  Radio,
} from "lucide-react";

interface LiveExamMonitorProps {
  quiz: any;
  submissions: any[];
  onRefresh: (isBackground?: boolean) => void;
  onResetAttempt: (student: any) => void;
  onViewReview: (student: any) => void;
}

export function LiveExamMonitor({
  quiz,
  submissions,
  onRefresh,
  onResetAttempt,
  onViewReview,
}: LiveExamMonitorProps) {
  const [autoPoll, setAutoPoll] = useState(true);
  const [pollIntervalSec, setPollIntervalSec] = useState(8);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState(8);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "VIOLATIONS" | "SUBMITTED" | "NOT_STARTED">("ALL");

  const totalGradable = (quiz?.questions || []).filter((q: any) => q.type !== "INSTRUCTION").length || 1;

  // Keep a stable ref to onRefresh to avoid timer re-instantiations
  const onRefreshRef = React.useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Auto-polling effect
  useEffect(() => {
    if (!autoPoll) return;

    setSecondsUntilNextPoll(pollIntervalSec);

    const countdownTimer = setInterval(() => {
      setSecondsUntilNextPoll((prev) => {
        if (prev <= 1) {
          // Defer calling onRefresh outside React's render phase to prevent
          // "Cannot update a component while rendering a different component"
          setTimeout(() => {
            onRefreshRef.current?.(true);
          }, 0);
          return pollIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [autoPoll, pollIntervalSec]);

  // Categorize students
  const inProgressList = submissions.filter((s) => s.status === "IN_PROGRESS");
  const submittedList = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED");
  const notStartedList = submissions.filter((s) => s.status === "NOT_STARTED");
  const flaggedList = submissions.filter((s) => s.violationCount > 0);

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentIdNumber.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "IN_PROGRESS") return s.status === "IN_PROGRESS";
    if (filter === "VIOLATIONS") return s.violationCount > 0;
    if (filter === "SUBMITTED") return s.status === "SUBMITTED" || s.status === "AUTO_SUBMITTED";
    if (filter === "NOT_STARTED") return s.status === "NOT_STARTED";
    return true;
  });

  function formatDuration(startedAt: string | null) {
    if (!startedAt) return "--";
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor(Math.max(0, now - start) / 60000);
    return `${elapsedMinutes}m elapsed`;
  }

  return (
    <div className="space-y-6">
      {/* Top Monitor Banner & Controls */}
      <div className="flat-card p-4 sm:p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 bg-indigo-950 border border-indigo-500/40 shrink-0">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base tracking-tight">
                Live Exam Proctoring Room
              </h2>
              {autoPoll && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE ({secondsUntilNextPoll}s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live telemetry tracking active examinees, question progress, and anti-cheating violations in real time.
            </p>
          </div>
        </div>

        {/* Polling Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 transition-colors border ${
              autoPoll
                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{autoPoll ? "Auto-Refresh: ON" : "Auto-Refresh: OFF"}</span>
          </button>

          <button
            onClick={() => {
              onRefresh();
              setSecondsUntilNextPoll(pollIntervalSec);
            }}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold flex items-center gap-1.5 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter(filter === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")}
          className={`flat-card p-4 text-left border-2 transition-all ${
            filter === "IN_PROGRESS"
              ? "border-indigo-600 bg-indigo-50/50 shadow-[3px_3px_0px_0px_rgba(79,70,229,1)]"
              : "bg-white border-slate-300 hover:border-slate-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Actively Answering
            </span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{inProgressList.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Currently inside exam room</p>
        </button>

        <button
          onClick={() => setFilter(filter === "VIOLATIONS" ? "ALL" : "VIOLATIONS")}
          className={`flat-card p-4 text-left border-2 transition-all ${
            filter === "VIOLATIONS"
              ? "border-rose-600 bg-rose-50/50 shadow-[3px_3px_0px_0px_rgba(225,29,72,1)]"
              : "bg-white border-slate-300 hover:border-slate-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Flagged Violations
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700">{flaggedList.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Students with warning flags</p>
        </button>

        <button
          onClick={() => setFilter(filter === "SUBMITTED" ? "ALL" : "SUBMITTED")}
          className={`flat-card p-4 text-left border-2 transition-all ${
            filter === "SUBMITTED"
              ? "border-emerald-600 bg-emerald-50/50 shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]"
              : "bg-white border-slate-300 hover:border-slate-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Submitted & Done
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800">{submittedList.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Finished and evaluated</p>
        </button>

        <button
          onClick={() => setFilter(filter === "NOT_STARTED" ? "ALL" : "NOT_STARTED")}
          className={`flat-card p-4 text-left border-2 transition-all ${
            filter === "NOT_STARTED"
              ? "border-slate-800 bg-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
              : "bg-white border-slate-300 hover:border-slate-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Not Started
            </span>
          </div>
          <div className="text-2xl font-black text-slate-700">{notStartedList.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting student entry</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or ID..."
            className="flat-input text-xs pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <span>Filter:</span>
          {(["ALL", "IN_PROGRESS", "VIOLATIONS", "SUBMITTED", "NOT_STARTED"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                filter === mode
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Live Student Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flat-card p-12 text-center bg-white border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No students match this live filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((student) => {
            const answeredCount = (student.answers || []).filter(
              (a: any) => typeof a.studentAnswer === "string" && a.studentAnswer.trim().length > 0
            ).length;
            const progressPercent = Math.min(100, Math.round((answeredCount / totalGradable) * 100));

            return (
              <div
                key={student.studentIdNumber}
                className={`flat-card p-4 bg-white border-2 flex flex-col justify-between transition-all shadow-xs ${
                  student.status === "IN_PROGRESS"
                    ? "border-indigo-400 bg-indigo-50/20"
                    : student.violationCount > 0
                    ? "border-rose-400"
                    : student.hasSubmitted
                    ? "border-emerald-300"
                    : "border-slate-200 opacity-80"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {student.studentName}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {student.studentIdNumber}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {student.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                          In Progress
                        </span>
                      ) : student.status === "SUBMITTED" || student.status === "AUTO_SUBMITTED" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Submitted
                        </span>
                      ) : student.status === "DISQUALIFIED" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          Disqualified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5">
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Progress Bar for In-Progress students */}
                  {student.status === "IN_PROGRESS" && (
                    <div className="space-y-1 bg-white p-2.5 border border-indigo-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-600">
                          Answered {answeredCount} of {totalGradable}
                        </span>
                        <span className="text-indigo-600 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 overflow-hidden border border-slate-200">
                        <div
                          className="bg-indigo-600 h-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono pt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDuration(student.startedAt)}
                      </div>
                    </div>
                  )}

                  {/* Submitted Score Card */}
                  {student.hasSubmitted && (
                    <div className="bg-emerald-50/70 p-2 border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950">Score Awarded:</span>
                      <span className="font-black text-emerald-800 font-mono">
                        {student.score} / {student.totalPoints} ({Math.round(student.percentage)}%)
                      </span>
                    </div>
                  )}

                  {/* Violation Warning Bar */}
                  {student.violationCount > 0 && (
                    <div className="bg-rose-50 border border-rose-200 p-2 flex items-center justify-between text-xs text-rose-900">
                      <span className="flex items-center gap-1.5 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        {student.violationCount} Violations Recorded
                      </span>
                      <span className="text-[10px] text-rose-700 font-mono">
                        Max: {quiz?.maxViolations}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewReview(student)}
                    disabled={!student.submissionId}
                    className="flat-button-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-semibold disabled:opacity-40"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{student.hasSubmitted ? "View Review" : "View Answers"}</span>
                  </button>

                  {student.status !== "NOT_STARTED" && (
                    <button
                      onClick={() => onResetAttempt(student)}
                      className="flat-button-secondary text-[11px] py-1 px-2 text-rose-700 border-rose-200 hover:bg-rose-50 font-bold flex items-center gap-1"
                      title="Clear attempt & let student retake"
                    >
                      <RotateCcw className="w-3 h-3 text-rose-600" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
