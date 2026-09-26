"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { QuestionDraft } from "@/types/quiz";
import { DocxParseSummary } from "@/lib/docx-parser";

interface DocxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionDraft[], mode: "append" | "replace") => void;
  currentQuestionCount: number;
}

export function DocxImportModal({
  isOpen,
  onClose,
  onImport,
  currentQuestionCount,
}: DocxImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<QuestionDraft[]>([]);
  const [summary, setSummary] = useState<DocxParseSummary | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [defaultPoints, setDefaultPoints] = useState<number>(1);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveSummary = React.useMemo(() => {
    if (!parsedQuestions.length) return null;
    const gradable = parsedQuestions.filter((q) => q.type !== "INSTRUCTION");
    return {
      total: parsedQuestions.length,
      multipleChoice: parsedQuestions.filter((q) => q.type === "MULTIPLE_CHOICE").length,
      trueFalse: parsedQuestions.filter((q) => q.type === "TRUE_FALSE").length,
      shortAnswer: parsedQuestions.filter((q) => q.type === "SHORT_ANSWER").length,
      instructions: parsedQuestions.filter((q) => q.type === "INSTRUCTION").length,
      withAnswers: gradable.filter((q) => q.correctAnswers.length > 0).length,
      withoutAnswers: gradable.filter((q) => q.correctAnswers.length === 0).length,
    };
  }, [parsedQuestions]);

  const activeSummary = liveSummary || summary;

  const nonMcCount = parsedQuestions.filter(
    (q) => q.type === "TRUE_FALSE" || q.type === "SHORT_ANSWER"
  ).length;

  const handleToggleNonMcType = (index: number, newType: "TRUE_FALSE" | "SHORT_ANSWER") => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (!target || target.type === "INSTRUCTION" || (target.type === "MULTIPLE_CHOICE" && target.options.length > 2)) {
        return prev;
      }
      updated[index] = {
        ...target,
        type: newType,
        options: newType === "TRUE_FALSE" ? ["True", "False"] : [],
        correctAnswers: [],
        allowFuzzy: newType === "SHORT_ANSWER",
      };
      return updated;
    });
  };

  const handleBulkSwitchNonMcType = (newType: "TRUE_FALSE" | "SHORT_ANSWER") => {
    setParsedQuestions((prev) =>
      prev.map((q) => {
        if (q.type === "INSTRUCTION" || (q.type === "MULTIPLE_CHOICE" && q.options.length > 2)) {
          return q;
        }
        return {
          ...q,
          type: newType,
          options: newType === "TRUE_FALSE" ? ["True", "False"] : [],
          correctAnswers: [],
          allowFuzzy: newType === "SHORT_ANSWER",
        };
      })
    );
  };

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".docx") && !ext.endsWith(".doc") && !ext.endsWith(".txt")) {
      setError("Please select a Word document (.docx) or Text file (.txt)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParsing(true);
    setParsedQuestions([]);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/teacher/quizzes/parse-docx", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse document");
      }

      setParsedQuestions(data.questions);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message || "An error occurred while parsing the document.");
    } finally {
      setParsing(false);
    }
  };

  const handleProcessText = async () => {
    if (!pastedText.trim()) {
      setError("Please paste your questionnaire text in the box below.");
      return;
    }

    setError(null);
    setParsing(true);
    setParsedQuestions([]);
    setSummary(null);

    try {
      const res = await fetch("/api/teacher/quizzes/parse-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse questionnaire text");
      }

      setParsedQuestions(data.questions);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message || "An error occurred while parsing the text.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) return;

    // Apply points (instruction items must always have 0 points)
    const finalQuestions = parsedQuestions.map((q) => ({
      ...q,
      points: q.type === "INSTRUCTION" ? 0 : (Number(defaultPoints) || 1),
    }));

    onImport(finalQuestions, importMode);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPastedText("");
    setParsedQuestions([]);
    setSummary(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in zoom-in-95">
      <div className="bg-white border-2 border-slate-900 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col rounded-none">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Import Questionnaire Document
              </h2>
              <p className="text-[11px] text-slate-500">
                Auto-detects questions and choices from Word or pasted text. Leaves answers for you to select.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Source Tabs */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab("file");
                setError(null);
              }}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === "file"
                  ? "border-indigo-600 text-indigo-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Document (.docx, .txt)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("paste");
                setError(null);
              }}
              className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === "paste"
                  ? "border-indigo-600 text-indigo-600 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Text Directly</span>
            </button>
          </div>

          {/* Guidelines Toggle */}
          <div className="border border-slate-200 bg-slate-50/70 p-3">
            <button
              type="button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>Supported Questionnaire Formats</span>
              </div>
              {showGuidelines ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {showGuidelines && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 text-[11px] text-slate-600 leading-relaxed">
                <div>
                  <p className="font-bold text-slate-800 mb-1">1. Multiple Choice Questions (Options A, B, C, D):</p>
                  <pre className="bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
{`1. What is the primary purpose of Figma?
A. Video editing
B. UI/UX design and prototyping
C. Spreadsheet computation
D. Database management`}
                  </pre>
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">2. Identification / Short Answer / Hotkeys:</p>
                  <pre className="bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
{`21. This tool is used to create the main container or screen.
Answer: ______________________

26. Move Tool: _________`}
                  </pre>
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px]">
                  <strong>Note:</strong> All questions and choices will be cleanly detected. You can easily click the correct choice or enter the answer keys right in the quiz builder.
                </div>
              </div>
            )}
          </div>

          {/* Upload File Mode */}
          {activeTab === "file" ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                file
                  ? "border-indigo-500 bg-indigo-50/20"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-none flex items-center justify-center">
                  {parsing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <p className="font-bold text-slate-800">
                    {file ? file.name : "Click to select or drag & drop a questionnaire file"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB - Analyzing...`
                      : "Supports Microsoft Word (.docx) and Plain Text (.txt)"}
                  </p>
                </div>

                {parsing && (
                  <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 mt-1">
                    <span>Extracting and structuring quiz questions...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Paste Text Mode */
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your questionnaire text here directly from Word, Google Docs, or PDF...

Example:
1. What is the primary purpose of Figma?
A. Video editing
B. UI/UX design and prototyping
C. Spreadsheet computation
D. Database management

2. Move Tool: _________"
                rows={8}
                className="flat-input text-xs font-mono resize-y"
              />
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-slate-400">
                  Section headers (e.g. Part II - True or False) and directions are automatically imported as section text fields.
                </p>
                <button
                  type="button"
                  onClick={handleProcessText}
                  disabled={parsing || !pastedText.trim()}
                  className="flat-button-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {parsing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{parsing ? "Detecting..." : "Auto-Detect Questions"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Results Summary & Preview */}
          {activeSummary && parsedQuestions.length > 0 && (
            <div className="space-y-4 pt-2 animate-in fade-in">
              {/* Summary Stats */}
              <div
                className={`grid gap-2.5 ${
                  activeSummary.instructions > 0
                    ? "grid-cols-2 sm:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                <div className="p-3 bg-slate-100 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Questions</div>
                  <div className="text-lg font-black text-slate-900">
                    {activeSummary.total - (activeSummary.instructions || 0)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200">
                  <div className="text-[10px] uppercase font-bold text-blue-600">Multiple Choice</div>
                  <div className="text-lg font-black text-blue-900">{activeSummary.multipleChoice}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">True / False</div>
                  <div className="text-lg font-black text-emerald-900">{activeSummary.trueFalse}</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200">
                  <div className="text-[10px] uppercase font-bold text-purple-600">Short Answer / ID</div>
                  <div className="text-lg font-black text-purple-900">{activeSummary.shortAnswer}</div>
                </div>
                {activeSummary.instructions > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200">
                    <div className="text-[10px] uppercase font-bold text-amber-700">Section Notes</div>
                    <div className="text-lg font-black text-amber-900">{activeSummary.instructions}</div>
                  </div>
                )}
              </div>

              {/* Import Options: Points & Mode */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-[11px]">Points per item:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={defaultPoints}
                    onChange={(e) => setDefaultPoints(Math.max(1, Number(e.target.value)))}
                    className="flat-input text-xs w-16 py-1 px-2 font-mono text-center"
                  />
                </div>

                {currentQuestionCount > 0 && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 text-[11px]">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                        className="text-indigo-600 accent-indigo-600"
                      />
                      <span>Append ({currentQuestionCount} exist)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 text-[11px]">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="text-indigo-600 accent-indigo-600"
                      />
                      <span>Replace existing</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Preview Cards */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detected Questions Preview ({parsedQuestions.length})</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">
                    ⚡ Switch types or customize per item before importing
                  </span>
                </div>

                {nonMcCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 border border-slate-300 text-xs">
                    <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bulk switch items without choices ({nonMcCount}):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBulkSwitchNonMcType("TRUE_FALSE")}
                        className="flat-button-secondary text-[10px] py-1 px-2.5 bg-white text-emerald-800 border-emerald-400 hover:bg-emerald-50 font-bold"
                      >
                        All to True / False
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSwitchNonMcType("SHORT_ANSWER")}
                        className="flat-button-secondary text-[10px] py-1 px-2.5 bg-white text-purple-800 border-purple-400 hover:bg-purple-50 font-bold"
                      >
                        All to Short Answer
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 p-2 bg-slate-50">
                  {(() => {
                    let gradableNum = 0;
                    return parsedQuestions.map((q, idx) => {
                      const isInstruction = q.type === "INSTRUCTION";
                      if (!isInstruction) gradableNum++;
                      const displayNum = isInstruction ? "§" : gradableNum;
                      const isExplicitMc = q.type === "MULTIPLE_CHOICE" && q.options.length > 2;

                      return (
                        <div
                          key={idx}
                          className={`p-3 border text-[11px] space-y-2 ${
                            isInstruction
                              ? "bg-slate-100/70 border-slate-300"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-slate-900 flex items-start gap-1.5 flex-1">
                              <span
                                className={`w-4 h-4 text-white text-[10px] flex items-center justify-center font-mono shrink-0 mt-0.5 ${
                                  isInstruction ? "bg-slate-700 font-bold" : "bg-slate-900"
                                }`}
                              >
                                {displayNum}
                              </span>
                              <span className="whitespace-pre-line line-clamp-3">
                                {isInstruction ? `[Section Note] ${q.prompt}` : q.prompt}
                              </span>
                            </div>

                            {/* Type selector or badge */}
                            {isInstruction ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 bg-slate-800 text-white border-slate-800">
                                Instruction
                              </span>
                            ) : isExplicitMc ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                                Multiple Choice
                              </span>
                            ) : (
                              <div className="flex items-center border border-slate-300 bg-slate-100 p-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleNonMcType(idx, "TRUE_FALSE")}
                                  className={`px-2 py-0.5 text-[9px] font-bold transition-colors ${
                                    q.type === "TRUE_FALSE"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                  }`}
                                  title="Format as True / False"
                                >
                                  True / False
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleNonMcType(idx, "SHORT_ANSWER")}
                                  className={`px-2 py-0.5 text-[9px] font-bold transition-colors ${
                                    q.type === "SHORT_ANSWER"
                                      ? "bg-purple-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                  }`}
                                  title="Format as Short Answer / Identification"
                                >
                                  Short Answer
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Options / Format display */}
                          {q.type === "MULTIPLE_CHOICE" && q.options.length > 0 && (
                            <div className="pl-5 text-slate-600 space-y-0.5">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = q.correctAnswers.includes(opt);
                                return (
                                  <div
                                    key={oIdx}
                                    className={`flex items-center gap-1 ${
                                      isCorrect ? "font-bold text-emerald-700" : ""
                                    }`}
                                  >
                                    <span className="font-mono text-[10px]">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span>{opt}</span>
                                    {isCorrect && (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 font-semibold ml-1">
                                        ✓ Pre-marked
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "TRUE_FALSE" && (
                            <div className="pl-5 flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-700">
                                True
                              </span>
                              <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-700">
                                False
                              </span>
                              <span className="text-[10px] text-amber-600 italic">
                                (Answer left blank — select in quiz builder or import answer key)
                              </span>
                            </div>
                          )}

                          {q.type === "SHORT_ANSWER" && (
                            <div className="pl-5 flex items-center gap-2 text-slate-500 italic text-[10px]">
                              <span className="border border-dashed border-slate-300 px-2 py-0.5 bg-slate-50 text-slate-400 font-mono">
                                ________
                              </span>
                              <span>(Identification — answer left blank to type in builder or import answer key)</span>
                            </div>
                          )}

                          {isInstruction && (
                            <div className="pl-5 text-slate-500 italic text-[10px]">
                              (Instructional section note — not graded, 0 pts)
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={handleClose}
            className="flat-button-secondary text-xs py-1.5 px-3"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedQuestions.length === 0 || parsing}
            onClick={handleConfirmImport}
            className="flat-button-primary text-xs py-2 px-5 flex items-center gap-1.5 font-bold disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {parsedQuestions.length > 0
                ? activeSummary?.instructions
                  ? `Import ${activeSummary.total - activeSummary.instructions} Questions (+${activeSummary.instructions} Section Notes)`
                  : `Import ${parsedQuestions.length} Questions into Quiz`
                : "Import Questions"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
