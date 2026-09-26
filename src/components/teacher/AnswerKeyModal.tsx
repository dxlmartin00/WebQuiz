"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  FileCheck,
  Check,
} from "lucide-react";
import { QuestionDraft } from "@/types/quiz";
import {
  parseAnswerKeyText,
  matchAnswerKeysToQuestions,
  MatchedKeyResult,
} from "@/lib/answer-key-parser";

interface AnswerKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionDraft[];
  onApplyAnswers: (updatedQuestions: QuestionDraft[]) => void;
}

export function AnswerKeyModal({
  isOpen,
  onClose,
  questions,
  onApplyAnswers,
}: AnswerKeyModalProps) {
  const [activeTab, setActiveTab] = useState<"PASTE" | "FILE">("PASTE");
  const [rawText, setRawText] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute live match results
  const parsedKeys = parseAnswerKeyText(rawText);
  const matchResults: MatchedKeyResult[] = matchAnswerKeysToQuestions(questions, parsedKeys);
  const gradableQuestions = questions.filter((q) => q.type !== "INSTRUCTION");
  const matchedCount = matchResults.filter((m) => m.isMatched).length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setFileLoading(true);

    try {
      if (file.name.endsWith(".docx")) {
        // Use backend docx parser route
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/teacher/quizzes/parse-docx", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to read Word document");

        // Use raw text or build from extracted items
        const extractedText =
          json.rawText ||
          (json.questions ? json.questions.map((q: any, idx: number) => `${idx + 1}. ${q.prompt}`).join("\n") : "");

        setRawText(extractedText);
      } else {
        // Plain text, CSV, etc.
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setRawText(text || "");
          setFileLoading(false);
        };
        reader.onerror = () => {
          setError("Failed to read text file");
          setFileLoading(false);
        };
        reader.readAsText(file);
        return;
      }
    } catch (err: any) {
      setError(err.message || "Failed to process file");
    } finally {
      setFileLoading(false);
    }
  };

  const handleApply = () => {
    const updated = [...questions];

    for (const res of matchResults) {
      if (res.isMatched && res.resolvedAnswer) {
        updated[res.questionIndex] = {
          ...updated[res.questionIndex],
          correctAnswers: [res.resolvedAnswer],
        };
      }
    }

    onApplyAnswers(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="flat-card border-2 border-slate-900 bg-white max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 border border-indigo-300 text-indigo-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Upload &amp; Auto-Match Answer Key
              </h3>
              <p className="text-xs text-slate-500">
                Instantly populate correct answers for {gradableQuestions.length} questions from text, Word, or CSV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              onClick={() => setActiveTab("PASTE")}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === "PASTE"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Answer Key Text</span>
            </button>
            <button
              onClick={() => setActiveTab("FILE")}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === "FILE"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document (.txt, .docx, .csv)</span>
            </button>
          </div>

          {/* Tab 1: Direct Paste */}
          {activeTab === "PASTE" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Paste Key (Numbered or comma separated):
                </label>
                <span className="text-[11px] text-slate-400">
                  e.g. 1. A, 2. C, 3. True, 4. Photosynthesis
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`1. A\n2. C\n3. True\n4. Photosynthesis\n5. B`}
                rows={5}
                className="flat-input font-mono text-xs w-full py-2.5 leading-relaxed resize-y"
              />
            </div>
          )}

          {/* Tab 2: File Upload */}
          {activeTab === "FILE" && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                <span className="text-xs font-bold text-slate-800">
                  {fileName ? fileName : "Click or drag & drop Answer Key document"}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supports Word (.docx), Plain Text (.txt), or CSV (.csv)
                </span>
                <input
                  type="file"
                  accept=".txt,.csv,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileLoading && (
                <div className="text-center text-xs text-indigo-600 font-mono py-2">
                  Parsing answer key file...
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-time Match Preview Table */}
          {questions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Live Match Preview
                  </h4>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-2 py-0.5 font-bold ${
                      matchedCount === gradableQuestions.length
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : matchedCount > 0
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300"
                    }`}
                  >
                    Matched {matchedCount} / {gradableQuestions.length} Questions
                  </span>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">#</th>
                      <th className="px-3 py-2">Question Prompt</th>
                      <th className="px-3 py-2 w-28">Detected Key</th>
                      <th className="px-3 py-2">Resolved Answer</th>
                      <th className="px-3 py-2 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                    {matchResults.map((m) => (
                      <tr
                        key={m.questionIndex}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          m.isMatched ? "bg-emerald-50/20" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 text-[11px]">
                          {m.questionNumber}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate font-medium text-slate-900" title={m.prompt}>
                          {m.prompt}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-indigo-800 font-bold">
                          {m.rawKey ? m.rawKey : <span className="text-slate-300 italic font-normal">(empty)</span>}
                        </td>
                        <td className="px-3 py-2">
                          {m.resolvedAnswer ? (
                            <span className="font-mono text-slate-900 font-semibold text-[11px]">
                              {m.resolvedAnswer}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              {m.reason || "No match"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.isMatched ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5">
                              <Check className="w-3 h-3" />
                              <span>Matched</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5">
                              Unset
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flat-button-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={matchedCount === 0}
            className="flat-button-primary bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 px-5 font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply {matchedCount} Answers</span>
          </button>
        </div>
      </div>
    </div>
  );
}
