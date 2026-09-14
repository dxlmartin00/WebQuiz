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
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<QuestionDraft[]>([]);
  const [summary, setSummary] = useState<DocxParseSummary | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      setError("Please select a Microsoft Word document ending in .docx");
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) return;
    onImport(parsedQuestions, importMode);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedQuestions([]);
    setSummary(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col rounded-none">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Import Questions from Word (.docx)
              </h2>
              <p className="text-[11px] text-slate-500">
                Upload a test or exam document to automatically create quiz items
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Guidelines Toggle */}
          <div className="border border-slate-200 bg-slate-50/70 p-3">
            <button
              type="button"
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>Supported Question Formats & Guidelines</span>
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
                  <p className="font-bold text-slate-800 mb-1">1. Multiple Choice Questions:</p>
                  <pre className="bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
{`1. What is the standard protocol for web browsing?
A. FTP
B. HTTP
C. SMTP
D. DNS
Answer: B (or Answer: HTTP)`}
                  </pre>
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">2. True or False Questions:</p>
                  <pre className="bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
{`2. SQL is used for querying relational databases.
A. True
B. False
Answer: True`}
                  </pre>
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">3. Short Answer / Identification Questions:</p>
                  <pre className="bg-white p-2 border border-slate-200 font-mono text-[10px] text-slate-700">
{`3. What does CPU stand for?
Answer: Central Processing Unit`}
                  </pre>
                </div>
                <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px]">
                  <strong>Tip:</strong> Answers can also be marked directly with an asterisk (e.g. <code>*A. Correct Choice</code>). If your document does not include answers, all questions will still be imported so you can select the correct answers in the builder.
                </div>
              </div>
            )}
          </div>

          {/* Upload Area */}
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
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
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
                  {file ? file.name : "Click to upload or drag & drop a .docx file"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "Supports Microsoft Word (.docx) files"}
                </p>
              </div>

              {parsing && (
                <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 mt-1">
                  <span>Extracting and structuring quiz questions...</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Results Summary & Preview */}
          {summary && parsedQuestions.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-100 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Items</div>
                  <div className="text-lg font-black text-slate-900">{summary.total}</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200">
                  <div className="text-[10px] uppercase font-bold text-blue-600">Multiple Choice</div>
                  <div className="text-lg font-black text-blue-900">{summary.multipleChoice}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">True / False</div>
                  <div className="text-lg font-black text-emerald-900">{summary.trueFalse}</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200">
                  <div className="text-[10px] uppercase font-bold text-purple-600">Short Answer</div>
                  <div className="text-lg font-black text-purple-900">{summary.shortAnswer}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    <strong className="text-emerald-700">{summary.withAnswers}</strong> with detected answers
                  </span>
                  {summary.withoutAnswers > 0 && (
                    <span className="text-amber-700 font-medium">
                      ⚠️ {summary.withoutAnswers} require manual answer input in builder
                    </span>
                  )}
                </div>
              </div>

              {/* Import Mode Selector */}
              {currentQuestionCount > 0 && (
                <div className="p-3 bg-white border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-[11px]">Import Method:</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                        className="text-indigo-600"
                      />
                      <span>Append to existing ({currentQuestionCount} questions currently)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="text-indigo-600"
                      />
                      <span>Replace existing questions</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview Cards */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Detected Questions Preview ({parsedQuestions.length})</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 p-2 bg-slate-50">
                  {parsedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 text-[11px] space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 bg-slate-800 text-white text-[10px] flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="line-clamp-2">{q.prompt}</span>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {q.type.replace("_", " ")}
                        </span>
                      </div>

                      {q.options.length > 0 && (
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
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "SHORT_ANSWER" && (
                        <div className="pl-5 text-slate-600">
                          {q.correctAnswers.length > 0 ? (
                            <span className="text-emerald-700 font-semibold">
                              Answer: {q.correctAnswers.join(" / ")}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic">
                              (No answer detected in document - enter manually in editor)
                            </span>
                          )}
                        </div>
                      )}

                      {q.correctAnswers.length === 0 && q.type !== "SHORT_ANSWER" && (
                        <div className="pl-5 text-amber-600 italic text-[10px]">
                          (No answer selected yet - you can click the correct option in the editor)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
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
            className="flat-button-primary text-xs py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {parsedQuestions.length > 0
                ? `Import ${parsedQuestions.length} Questions`
                : "Import Questions"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
