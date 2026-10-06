"use client";

import React from "react";
import { Plus, FileText, CheckCircle2, ToggleLeft, AlignLeft } from "lucide-react";

interface QuestionInserterProps {
  onAdd: (type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "INSTRUCTION") => void;
  isLast?: boolean;
  className?: string;
}

export function QuestionInserter({
  onAdd,
  isLast = false,
  className = "",
}: QuestionInserterProps) {
  return (
    <div
      className={`relative flex items-center justify-center my-3 transition-all group ${
        isLast ? "py-4 opacity-100" : "py-2"
      } ${className}`}
    >
      {/* Horizontal Divider Line (Google Colab style: subtle line that highlights on hover) */}
      <div
        className={`absolute inset-x-0 h-px transition-colors ${
          isLast
            ? "bg-slate-200 group-hover:bg-indigo-300"
            : "bg-transparent group-hover:bg-indigo-300"
        }`}
      />

      {/* Insertion Buttons (Center-anchored pills) */}
      <div
        className={`relative z-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 transition-all duration-150 ${
          isLast
            ? "opacity-90 group-hover:opacity-100 scale-100"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
        }`}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white px-1.5 select-none hidden sm:inline">
          Insert:
        </span>

        {/* Multiple Choice */}
        <button
          type="button"
          onClick={() => onAdd("MULTIPLE_CHOICE")}
          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 text-xs px-2.5 py-1.5 font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          title="Insert Multiple Choice question"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Multiple Choice</span>
        </button>

        {/* True / False */}
        <button
          type="button"
          onClick={() => onAdd("TRUE_FALSE")}
          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 text-xs px-2.5 py-1.5 font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          title="Insert True/False question"
        >
          <ToggleLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>True / False</span>
        </button>

        {/* Short Answer */}
        <button
          type="button"
          onClick={() => onAdd("SHORT_ANSWER")}
          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 text-xs px-2.5 py-1.5 font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          title="Insert Short Answer / Fuzzy matched question"
        >
          <AlignLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Short Answer</span>
        </button>

        {/* Instruction Note / Text Field */}
        <button
          type="button"
          onClick={() => onAdd("INSTRUCTION")}
          className="bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 text-xs px-2.5 py-1.5 font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          title="Insert section note, passage, or instruction block"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Text Field / Note</span>
        </button>
      </div>
    </div>
  );
}
