"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  CheckSquare,
  Square,
  Trash2,
  ArrowRight,
  RefreshCw,
  Info,
  Edit3,
} from "lucide-react";
import {
  ParsedStudent,
  ParseResult,
  parseClassListFile,
  parseClassListText,
} from "@/lib/class-list-parser";

interface ClassListImportModalProps {
  subjectId: string;
  subjectCode: string;
  existingEnrollments: Array<{ studentIdNumber: string; studentName: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function ClassListImportModal({
  subjectId,
  subjectCode,
  existingEnrollments = [],
  isOpen,
  onClose,
  onSuccess,
}: ClassListImportModalProps) {
  const [activeTab, setActiveTab] = useState<"FILE" | "PASTE">("FILE");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review step state
  const [step, setStep] = useState<"UPLOAD" | "REVIEW">("UPLOAD");
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [students, setStudents] = useState<ParsedStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingIdSet = new Set(
    existingEnrollments.map((e) => e.studentIdNumber.toUpperCase())
  );

  const handleProcessParseResult = (result: ParseResult) => {
    if (result.students.length === 0) {
      setError("No valid student ID numbers and names were found in the file.");
      return;
    }

    // Mark whether already enrolled in this subject
    const enhancedStudents: ParsedStudent[] = result.students.map((s) => ({
      ...s,
      isAlreadyEnrolled: existingIdSet.has(s.studentIdNumber.toUpperCase()),
      selected: !existingIdSet.has(s.studentIdNumber.toUpperCase()) && !s.isDuplicateInFile,
    }));

    setParsedData(result);
    setStudents(enhancedStudents);
    setStep("REVIEW");
    setError(null);
  };

  const handleFileChange = async (selectedFile: File) => {
    try {
      setParsing(true);
      setError(null);
      setFile(selectedFile);
      const result = await parseClassListFile(selectedFile);
      handleProcessParseResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to parse Excel/CSV file.");
    } finally {
      setParsing(false);
    }
  };

  const handleTextParse = () => {
    if (!rawText.trim()) return;
    try {
      setParsing(true);
      setError(null);
      const result = parseClassListText(rawText);
      handleProcessParseResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to parse pasted text.");
    } finally {
      setParsing(false);
    }
  };

  // Toggle selection
  const toggleSelectStudent = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectAll = (select: boolean) => {
    setStudents((prev) => prev.map((s) => ({ ...s, selected: select })));
  };

  // Inline edit
  const handleEditStudent = (
    id: string,
    field: "studentIdNumber" | "studentName",
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Remove student from import list
  const handleDeleteRow = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // Confirm and submit selected students
  const handleConfirmEnrollment = async () => {
    const selectedToEnroll = students.filter((s) => s.selected && s.studentIdNumber.trim());
    if (selectedToEnroll.length === 0) {
      setError("Please select at least one student to enroll.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/teacher/subjects/${subjectId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: selectedToEnroll.map((s) => ({
            studentIdNumber: s.studentIdNumber.trim().toUpperCase(),
            studentName: s.studentName.trim(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll students.");
      }

      onSuccess(data.addedCount || selectedToEnroll.length);
      handleResetAndClose();
    } catch (err: any) {
      setError(err.message || "Error submitting roster enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep("UPLOAD");
    setFile(null);
    setRawText("");
    setParsedData(null);
    setStudents([]);
    setError(null);
    onClose();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.studentIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = students.filter((s) => s.selected).length;
  const newCount = students.filter((s) => !s.isAlreadyEnrolled).length;
  const duplicateCount = students.filter((s) => s.isDuplicateInFile).length;
  const alreadyEnrolledCount = students.filter((s) => s.isAlreadyEnrolled).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="flat-card border-2 border-slate-900 bg-white max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flat-badge-indigo font-mono text-xs font-bold">
                {subjectCode}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Class List Roster Importer
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {step === "UPLOAD"
                ? "Upload Official University Class List"
                : "Review & Confirm Students to Enroll"}
            </h2>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: FILE UPLOAD OR PASTE */}
        {step === "UPLOAD" && (
          <div className="space-y-6">
            {/* Tab switch */}
            <div className="flex items-center border-b border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab("FILE")}
                className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "FILE"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Excel File (.xlsx, .xls, .csv)</span>
              </button>
              <button
                onClick={() => setActiveTab("PASTE")}
                className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "PASTE"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Paste Table / Text from Spreadsheet</span>
              </button>
            </div>

            {/* Sub-tab 1: Drag & Drop Excel File */}
            {activeTab === "FILE" && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-indigo-600 bg-indigo-50/60 scale-[0.99]"
                      : "border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {parsing ? "Parsing spreadsheet..." : "Drag & Drop your Class List Spreadsheet here"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Official University Format (.xlsx, .xls, .csv).
                  </p>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-3">
                    Automatically extracts <b>Idnumber</b> & <b>Fullname</b> while ignoring headers, course, gender, contact info, and remarks.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Copy Paste from Excel */}
            {activeTab === "PASTE" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Copy cells directly from your Excel / Google Sheets and paste below:
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={8}
                    placeholder={`Idnumber\tFullname\tGender\tCourse\n1006261\tAGUDO, FRAGILE JOHN C.\tMale\tBachelor of...\n1002355\tAYADE, JAZZTINE A.\tMale\tBachelor of...`}
                    className="flat-input font-mono text-xs resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTextParse}
                  disabled={parsing || !rawText.trim()}
                  className="flat-button-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Parse & Preview Students</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Guidance Info Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Automated Extraction Capabilities:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 leading-relaxed">
                <li>
                  <b>Top Header Safe:</b> Ignores campus name, schedule, instructor signature, and section metadata.
                </li>
                <li>
                  <b>Column Filter:</b> Keeps strictly <b>Student ID Number</b> & <b>Student Name</b>; ignores Gender, Code, Mobile, Email, and COR Status.
                </li>
                <li>
                  <b>Review Step:</b> You can verify, uncheck, or edit any student before saving to the class roster.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: INTERACTIVE REVIEW & VERIFICATION */}
        {step === "REVIEW" && (
          <div className="space-y-5">
            {/* Detected Header Info Banner */}
            {parsedData && (parsedData.subjectCodeHint || parsedData.instructorHint) && (
              <div className="bg-indigo-50/70 border border-indigo-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Detected Class Info:</span>
                  <span className="font-mono">{parsedData.subjectCodeHint || "N/A"}</span>
                  {parsedData.subjectTitleHint && <span>&bull; {parsedData.subjectTitleHint}</span>}
                </div>
                {parsedData.instructorHint && (
                  <div className="text-slate-600 font-medium">
                    Instructor: <b>{parsedData.instructorHint}</b>
                  </div>
                )}
              </div>
            )}

            {/* Metrics Overview Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="flat-card p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Found in File
                </span>
                <span className="text-base font-mono font-black text-slate-900">
                  {students.length}
                </span>
              </div>

              <div className="flat-card p-2.5 bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                  New to Enroll
                </span>
                <span className="text-base font-mono font-black text-emerald-800">
                  {newCount}
                </span>
              </div>

              <div className="flat-card p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Already Enrolled
                </span>
                <span className="text-base font-mono font-black text-slate-600">
                  {alreadyEnrolledCount}
                </span>
              </div>

              <div className="flat-card p-2.5 bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] text-indigo-700 uppercase font-bold block">
                  Selected to Save
                </span>
                <span className="text-base font-mono font-black text-indigo-700">
                  {selectedCount}
                </span>
              </div>
            </div>

            {/* Search & Bulk Select Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="flat-button-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deselect All</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter extracted list..."
                  className="flat-input text-xs pl-8 py-1.5 w-full sm:w-60"
                />
              </div>
            </div>

            {/* Interactive Student Review Table */}
            <div className="flat-card bg-white border border-slate-200 overflow-hidden max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCount > 0 && selectedCount === students.length}
                        onChange={(e) => selectAll(e.target.checked)}
                        className="rounded-none text-indigo-600 border-slate-300"
                      />
                    </th>
                    <th className="px-3 py-2.5 w-12 text-slate-400 font-mono text-[10px]">
                      Row
                    </th>
                    <th className="px-3 py-2.5 w-36">Student ID</th>
                    <th className="px-3 py-2.5">Full Name (Editable)</th>
                    <th className="px-3 py-2.5 w-32">Status</th>
                    <th className="px-3 py-2.5 w-10 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No students matching search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          s.selected
                            ? "bg-white hover:bg-slate-50/80"
                            : "bg-slate-50/50 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={s.selected}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="rounded-none text-indigo-600 border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">
                          {s.originalRowIndex}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={s.studentIdNumber}
                            onChange={(e) =>
                              handleEditStudent(s.id, "studentIdNumber", e.target.value)
                            }
                            className="flat-input font-mono font-bold text-xs py-1 px-2 uppercase w-full bg-transparent focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={s.studentName}
                            onChange={(e) =>
                              handleEditStudent(s.id, "studentName", e.target.value)
                            }
                            className="flat-input text-xs py-1 px-2 w-full bg-transparent focus:bg-white font-semibold text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {s.isAlreadyEnrolled ? (
                            <span className="flat-badge-slate text-[10px]">
                              Already Enrolled
                            </span>
                          ) : s.isDuplicateInFile ? (
                            <span className="flat-badge-amber text-[10px]">
                              Duplicate ID
                            </span>
                          ) : (
                            <span className="flat-badge-emerald text-[10px]">
                              Ready to Enroll
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(s.id)}
                            className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                            title="Exclude from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("UPLOAD")}
                className="flat-button-secondary text-xs py-2 px-3 self-start sm:self-auto"
              >
                &larr; Choose Different File
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="flat-button-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmEnrollment}
                  disabled={submitting || selectedCount === 0}
                  className="flat-button-primary text-xs py-2 px-4 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 font-bold flex items-center gap-1.5"
                >
                  {submitting ? (
                    <span>Enrolling {selectedCount} Students...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Enroll ({selectedCount} Students)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
