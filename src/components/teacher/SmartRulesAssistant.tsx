"use client";

import React from "react";
import { Sparkles, Plus, Clock, ShieldAlert, BookOpen, Calculator, FileText, CheckCircle2 } from "lucide-react";

interface SmartRulesAssistantProps {
  durationMinutes: number;
  maxViolations: number;
  questionCount: number;
  totalPoints: number;
  currentDescription: string;
  onUpdateDescription: (newText: string) => void;
}

export function SmartRulesAssistant({
  durationMinutes,
  maxViolations,
  questionCount,
  totalPoints,
  currentDescription,
  onUpdateDescription,
}: SmartRulesAssistantProps) {
  const handleGenerateRules = () => {
    const lines = [];

    // Keep existing custom notes if any
    const existingCustom = currentDescription
      .split("\n")
      .filter(
        (l) =>
          !l.startsWith("📋 EXAM RULES") &&
          !l.startsWith("• Time Limit:") &&
          !l.startsWith("• Anti-Cheating:") &&
          !l.startsWith("• Question Count:") &&
          !l.startsWith("• Auto-Save:")
      )
      .join("\n")
      .trim();

    if (existingCustom) {
      lines.push(existingCustom);
      lines.push("");
    } else {
      lines.push("Please review all questions carefully before submitting.");
      lines.push("");
    }

    lines.push("📋 EXAM RULES & INSTRUCTIONS:");
    lines.push(`• Time Limit: You have ${durationMinutes} minutes once started.`);
    lines.push(`• Anti-Cheating: Maximum of ${maxViolations} tab switch / window blur infractions allowed before automatic submission.`);
    lines.push(`• Question Count: ${questionCount} total questions (${totalPoints} points).`);
    lines.push("• Auto-Save: Answers are saved in real-time. Offline resilience is active.");

    onUpdateDescription(lines.join("\n"));
  };

  const handleAppendChip = (ruleText: string) => {
    if (currentDescription.includes(ruleText)) return;
    const separator = currentDescription.trim() ? "\n" : "";
    onUpdateDescription(`${currentDescription.trim()}${separator}• ${ruleText}`);
  };

  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Smart Rules &amp; Instructions Assistant</span>
        </div>

        <button
          type="button"
          onClick={handleGenerateRules}
          className="flat-button-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-bold text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-200"
          title="Auto-fill instructions matching your active duration, question count, and strike limit"
        >
          <Sparkles className="w-3 h-3 text-indigo-600" />
          <span>Generate from Active Rules ({durationMinutes}m, {maxViolations} strikes)</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-500 font-medium mr-1">Quick Add Policy:</span>
        <button
          type="button"
          onClick={() => handleAppendChip("Closed Book: No external materials, notes, or additional tabs allowed.")}
          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
        >
          + Closed Book
        </button>
        <button
          type="button"
          onClick={() => handleAppendChip("Calculator Policy: Basic or scientific calculators allowed. Phone calculators prohibited.")}
          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
        >
          + Calculator Rule
        </button>
        <button
          type="button"
          onClick={() => handleAppendChip("Formula Sheet: Official formula reference sheet provided / permitted.")}
          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
        >
          + Formula Sheet
        </button>
        <button
          type="button"
          onClick={() => handleAppendChip("Scratch Paper: Clean scratch paper is permitted for rough calculations.")}
          className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
        >
          + Scratch Paper
        </button>
      </div>
    </div>
  );
}
