"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Flame,
  CheckCircle2,
  Server,
  Layers,
} from "lucide-react";

interface HourlyBucket {
  hourLabel: string;
  hourKey: string;
  submissions: number;
  serverErrors: number;
  clientErrors: number;
}

interface TopEndpoint {
  endpoint: string;
  total: number;
  s500: number;
  s4xx: number;
}

interface TelemetryChartsProps {
  hourlyBuckets: HourlyBucket[];
  dbLatencyMs: number;
  dbStatus: string;
  latencyHistory?: number[];
  topEndpoints: TopEndpoint[];
  activeRooms?: Array<{ quizId: string; title: string; subjectCode: string; count: number }>;
  totalSubmissions24h: number;
  totalErrors24h: number;
  serverErrors24h: number;
}

export default function SystemTelemetryCharts({
  hourlyBuckets = [],
  dbLatencyMs,
  dbStatus,
  latencyHistory = [],
  topEndpoints = [],
  activeRooms = [],
  totalSubmissions24h = 0,
  totalErrors24h = 0,
  serverErrors24h = 0,
}: TelemetryChartsProps) {
  const [hoveredHour, setHoveredHour] = useState<HourlyBucket | null>(null);
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);

  // Compute maximum values for scaling
  const maxSubmissions = Math.max(1, ...hourlyBuckets.map((b) => b.submissions));
  const maxErrors = Math.max(1, ...hourlyBuckets.map((b) => b.serverErrors + b.clientErrors));
  const maxRoomStudents = Math.max(1, ...activeRooms.map((r) => r.count));

  // Gauge angle calculation (0 to 1000ms scale mapped to -90deg to +90deg)
  const clampedLatency = Math.min(1000, Math.max(0, dbLatencyMs));
  const gaugeAngle = -90 + (clampedLatency / 1000) * 180;

  // Latency sparkline SVG points
  const sparklineHistory = latencyHistory.length >= 2 ? latencyHistory : [dbLatencyMs, dbLatencyMs];
  const minLat = Math.min(...sparklineHistory, 0);
  const maxLat = Math.max(...sparklineHistory, 200, dbLatencyMs);
  const sparkWidth = 200;
  const sparkHeight = 40;
  const sparkPoints = sparklineHistory
    .map((val, i) => {
      const x = (i / (sparklineHistory.length - 1)) * sparkWidth;
      const y = sparkHeight - ((val - minLat) / (maxLat - minLat || 1)) * (sparkHeight - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Visual Health &amp; Activity Telemetry
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 border border-slate-200">
          24-Hour Observation Window
        </span>
      </div>

      {/* TOP ROW: Dual Primary Visual Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRAPH 1: 24-Hour Exam Traffic & Submissions Volume (Line Chart) */}
        <div className="lg:col-span-2 flat-card bg-white p-5 border border-slate-200 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Hourly Submissions Trend (Last 24 Hours)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total completed submissions: <strong className="text-slate-800 font-mono">{totalSubmissions24h}</strong> across all active quizzes.
              </p>
            </div>

            {/* Quick hover readout */}
            <div className="text-right">
              {hoveredHour ? (
                <div className="text-[11px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-900 px-2.5 py-1">
                  <strong>{hoveredHour.hourLabel}</strong>: {hoveredHour.submissions} submission{hoveredHour.submissions === 1 ? "" : "s"}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Hover points for details</span>
              )}
            </div>
          </div>

          {/* SVG Line / Area Chart for Submissions */}
          <div className="pt-4 pb-1">
            <div className="relative h-44 w-full">
              {/* Background gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-mono text-slate-400">
                <div className="border-b border-dashed border-slate-200 pb-0.5 flex justify-between">
                  <span>{maxSubmissions} peak</span>
                </div>
                <div className="border-b border-dashed border-slate-100 pb-0.5 flex justify-between">
                  <span>{Math.round(maxSubmissions / 2)}</span>
                </div>
                <div className="border-b border-slate-200 pb-0.5 flex justify-between">
                  <span>0</span>
                </div>
              </div>

              {/* Responsive SVG Line Chart */}
              {(() => {
                const chartWidth = 500;
                const chartHeight = 130;
                const count = hourlyBuckets.length;
                const points = hourlyBuckets.map((b, idx) => {
                  const x = count > 1 ? (idx / (count - 1)) * chartWidth : chartWidth / 2;
                  const y = maxSubmissions > 0
                    ? chartHeight - (b.submissions / maxSubmissions) * (chartHeight - 16) - 8
                    : chartHeight - 8;
                  return { x, y, bucket: b, idx };
                });

                const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                const areaPath = points.length > 0
                  ? `M 0,${chartHeight} L ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} L ${chartWidth},${chartHeight} Z`
                  : "";

                return (
                  <div className="absolute inset-0 pt-2 pb-6 px-1">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient id="submissionsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {/* Filled area gradient under the curve */}
                      {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#submissionsAreaGrad)"
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Main trend line */}
                      <polyline
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylinePoints}
                      />

                      {/* Interactive hover crosshair vertical guide */}
                      {hoveredHourIdx !== null && points[hoveredHourIdx] && (
                        <line
                          x1={points[hoveredHourIdx].x}
                          y1="0"
                          x2={points[hoveredHourIdx].x}
                          y2={chartHeight}
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Points along the line */}
                      {points.map((p) => {
                        const isHovered = hoveredHourIdx === p.idx;
                        const isCurrent = p.idx === count - 1;
                        const hasSubmissions = p.bucket.submissions > 0;

                        return (
                          <g key={p.bucket.hourKey}>
                            {/* Visual circle dot */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 5.5 : hasSubmissions || isCurrent ? 3.5 : 2}
                              fill={
                                isHovered
                                  ? "#4338ca"
                                  : isCurrent
                                  ? "#4f46e5"
                                  : hasSubmissions
                                  ? "#6366f1"
                                  : "#cbd5e1"
                              }
                              stroke="#ffffff"
                              strokeWidth={isHovered ? 2 : 1.5}
                              className="transition-all duration-150"
                            />

                            {/* Transparent wider hit-target for effortless hovering */}
                            <rect
                              x={Math.max(0, p.x - chartWidth / (count * 2))}
                              y="0"
                              width={chartWidth / count}
                              height={chartHeight}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => {
                                setHoveredHour(p.bucket);
                                setHoveredHourIdx(p.idx);
                              }}
                              onMouseLeave={() => {
                                setHoveredHour(null);
                                setHoveredHourIdx(null);
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* X-axis labels */}
              <div className="absolute bottom-0 inset-x-0 flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-1">
                <span>{hourlyBuckets[0]?.hourLabel || "24h ago"}</span>
                <span>{hourlyBuckets[Math.floor(hourlyBuckets.length / 2)]?.hourLabel || "12h ago"}</span>
                <span className="font-bold text-indigo-700">Now ({hourlyBuckets[hourlyBuckets.length - 1]?.hourLabel})</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-0.5 bg-indigo-600 inline-block" />
              <span>Hourly Submissions Curve</span>
            </span>
            <span className="font-mono text-slate-400">Values update on each telemetry ping</span>
          </div>
        </div>

        {/* GRAPH 2: Database Latency Gauge & Round-Trip Telemetry (1 column) */}
        <div className="flat-card bg-white p-5 border border-slate-200 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Database Latency Meter
              </h3>
            </div>
            <span
              className={`font-mono font-bold text-[10px] px-2 py-0.5 border ${
                dbLatencyMs < 200
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : dbLatencyMs < 500
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              }`}
            >
              {dbStatus}
            </span>
          </div>

          {/* SVG Half-Gauge Meter */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="relative w-48 h-28 flex items-center justify-center">
              <svg viewBox="0 0 160 90" className="w-full h-full overflow-visible">
                {/* Gauge Background Track (0-1000ms arc) */}
                <path
                  d="M 20 80 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  strokeLinecap="round"
                />

                {/* Optimal zone arc (0 to 200ms -> green) */}
                <path
                  d="M 20 80 A 60 60 0 0 1 50 35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeOpacity="0.4"
                />

                {/* Moderate zone arc (200 to 500ms -> amber) */}
                <path
                  d="M 50 35 A 60 60 0 0 1 110 35"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeOpacity="0.4"
                />

                {/* Degraded zone arc (500 to 1000ms -> rose) */}
                <path
                  d="M 110 35 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="12"
                  strokeOpacity="0.4"
                />

                {/* Needle Indicator */}
                <g transform={`rotate(${gaugeAngle} 80 80)`}>
                  <line
                    x1="80"
                    y1="80"
                    x2="80"
                    y2="28"
                    stroke="#0f172a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle cx="80" cy="80" r="5" fill="#0f172a" />
                </g>
              </svg>

              {/* Digital latency display in center */}
              <div className="absolute bottom-1 text-center font-mono">
                <div className="text-2xl font-black text-slate-900 leading-none">
                  {dbLatencyMs}
                  <span className="text-xs font-semibold text-slate-500 ml-1">ms</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">TiDB SQL Round-Trip</div>
              </div>
            </div>

            {/* Sparkline trend (history) */}
            <div className="w-full mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recent Pings</span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {sparklineHistory[sparklineHistory.length - 1]} ms
                </span>
              </div>
              <div className="w-32 h-8 relative">
                <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparkPoints}
                  />
                  {sparklineHistory.map((val, i) => {
                    const x = (i / (sparklineHistory.length - 1 || 1)) * sparkWidth;
                    const y = sparkHeight - ((val - minLat) / (maxLat - minLat || 1)) * (sparkHeight - 8) - 4;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.5"
                        fill={i === sparklineHistory.length - 1 ? "#10b981" : "#4f46e5"}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-mono text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>&lt;200ms Optimal</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>200-500ms Moderate</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>&gt;500ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: System Error Frequency & Top Error Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRAPH 3: 24-Hour Error Frequency Trend (2 columns) */}
        <div className="lg:col-span-2 flat-card bg-white p-5 border border-slate-200 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  24-Hour System Error Incident Timeline
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Incidents in last 24h: <strong className="text-rose-700 font-mono">{totalErrors24h}</strong> (
                <span className="text-rose-600 font-semibold">{serverErrors24h} HTTP 500s</span>,{" "}
                <span className="text-amber-600 font-semibold">{totalErrors24h - serverErrors24h} HTTP 4xx</span>)
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2.5 h-2.5 bg-rose-500 inline-block" /> 500 Server
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 bg-amber-400 inline-block" /> 4xx Client
              </span>
            </div>
          </div>

          {/* SVG Stacked Bar Chart for Errors */}
          <div className="pt-4 pb-1">
            <div className="relative h-40 w-full">
              {/* Background gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] font-mono text-slate-400">
                <div className="border-b border-dashed border-slate-200 pb-0.5 flex justify-between">
                  <span>{maxErrors} max</span>
                </div>
                <div className="border-b border-dashed border-slate-100 pb-0.5 flex justify-between">
                  <span>{Math.round(maxErrors / 2)}</span>
                </div>
                <div className="border-b border-slate-200 pb-0.5 flex justify-between">
                  <span>0 errors</span>
                </div>
              </div>

              {/* Stacked bars */}
              <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5 pt-4 pb-5 px-1">
                {hourlyBuckets.map((bucket) => {
                  const totalBucketErrors = bucket.serverErrors + bucket.clientErrors;
                  const heightPercent = maxErrors > 0 ? (totalBucketErrors / maxErrors) * 100 : 0;
                  const s500Percent = totalBucketErrors > 0 ? (bucket.serverErrors / totalBucketErrors) * 100 : 0;
                  const clientPercent = totalBucketErrors > 0 ? 100 - s500Percent : 0;

                  return (
                    <div
                      key={bucket.hourKey}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {totalBucketErrors > 0 && (
                        <div className="absolute -top-7 z-20 hidden group-hover:block bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 shadow-md whitespace-nowrap">
                          {bucket.hourLabel}: {bucket.serverErrors}x 500 | {bucket.clientErrors}x 4xx
                        </div>
                      )}

                      <div
                        style={{ height: `${Math.max(3, heightPercent)}%` }}
                        className={`w-full flex flex-col justify-end overflow-hidden transition-all duration-200 ${
                          totalBucketErrors > 0 ? "hover:ring-2 hover:ring-rose-400" : "bg-slate-100"
                        }`}
                      >
                        {bucket.serverErrors > 0 && (
                          <div
                            style={{ height: `${s500Percent}%` }}
                            className="w-full bg-rose-500"
                            title={`${bucket.serverErrors} HTTP 500 errors`}
                          />
                        )}
                        {bucket.clientErrors > 0 && (
                          <div
                            style={{ height: `${clientPercent}%` }}
                            className="w-full bg-amber-400"
                            title={`${bucket.clientErrors} client 4xx errors`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="absolute bottom-0 inset-x-0 flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-1">
                <span>{hourlyBuckets[0]?.hourLabel || "24h ago"}</span>
                <span>{hourlyBuckets[Math.floor(hourlyBuckets.length / 2)]?.hourLabel || "12h ago"}</span>
                <span className="font-bold text-slate-600">Now</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              {totalErrors24h === 0 ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Zero errors logged in the last 24 hours</span>
                </span>
              ) : (
                <span>Spikes align with student concurrent connection bursts</span>
              )}
            </span>
            <span className="text-slate-400">Error rate = {(totalErrors24h / Math.max(1, totalSubmissions24h) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* GRAPH 4: Top Impacted API Endpoints / Error Distribution (1 column) */}
        <div className="flat-card bg-white p-5 border border-slate-200 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Top Error Endpoints
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Ranked by count</span>
          </div>

          <div className="py-2 space-y-3">
            {topEndpoints.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <span>No endpoint errors on record</span>
              </div>
            ) : (
              topEndpoints.map((ep) => {
                const maxEpTotal = Math.max(1, topEndpoints[0].total);
                const barWidthPercent = (ep.total / maxEpTotal) * 100;
                return (
                  <div key={ep.endpoint} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800 truncate max-w-[170px]" title={ep.endpoint}>
                        {ep.endpoint}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 font-semibold">
                        {ep.total}x <span className="text-rose-600 font-bold">({ep.s500} 500s)</span>
                      </span>
                    </div>

                    {/* Proportional horizontal bar */}
                    <div className="w-full bg-slate-100 h-2 flex overflow-hidden">
                      <div
                        style={{ width: `${barWidthPercent}%` }}
                        className={`h-full ${ep.s500 > 0 ? "bg-rose-500" : "bg-amber-400"}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Quiz Concurrency Mini Distribution */}
          {activeRooms.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Active Rooms Load</span>
                </span>
                <span className="font-mono text-slate-500 text-[10px]">
                  {activeRooms.reduce((sum, r) => sum + r.count, 0)} online
                </span>
              </div>

              <div className="space-y-1.5">
                {activeRooms.slice(0, 3).map((r) => {
                  const percent = (r.count / maxRoomStudents) * 100;
                  return (
                    <div key={r.quizId} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="truncate max-w-[150px] font-semibold text-slate-800">{r.subjectCode} - {r.title}</span>
                        <span className="font-bold text-emerald-700">{r.count} students</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                        <div style={{ width: `${percent}%` }} className="bg-emerald-500 h-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400 flex justify-between">
            <span>Red = 500 Internal error</span>
            <span>Amber = 4xx Client error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
