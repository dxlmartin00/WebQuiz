import * as XLSX from "xlsx";

export interface GradebookExportData {
  quizTitle: string;
  subjectCode: string;
  subjectTitle: string;
  totalQuestions: number;
  totalQuizPoints: number;
  records: {
    studentIdNumber: string;
    studentName: string;
    score: number;
    totalPoints: number;
    percentage: number;
    status: string;
    startedAt: string;
    submittedAt: string;
    durationMinutes: number | string;
    violationCount: number;
    isFlagged: string;
  }[];
  questionBreakdown?: {
    studentIdNumber: string;
    studentName: string;
    questionNumber: number;
    prompt: string;
    type: string;
    studentAnswer: string;
    correctAnswer: string;
    matchType: string;
    pointsAwarded: number;
  }[];
  violations?: {
    studentIdNumber: string;
    studentName: string;
    eventType: string;
    details: string;
    timestamp: string;
  }[];
}

/**
 * Builds an XLSX workbook buffer with Gradebook, Question Breakdown, and Violation Audit Log sheets.
 */
export function generateQuizGradebookExcel(data: GradebookExportData): Uint8Array {
  const wb = XLSX.utils.book_new();

  // 1. Gradebook Summary Sheet
  const gradebookRows = data.records.map((r, idx) => ({
    "Rank": idx + 1,
    "Student ID": r.studentIdNumber,
    "Student Name": r.studentName,
    "Score": r.score,
    "Total Points": r.totalPoints,
    "Percentage (%)": `${r.percentage.toFixed(1)}%`,
    "Status": r.status,
    "Violations (Strikes)": r.violationCount,
    "Integrity Flag": r.isFlagged,
    "Time Started": r.startedAt,
    "Time Submitted": r.submittedAt,
    "Duration (Mins)": r.durationMinutes,
  }));

  const wsGradebook = XLSX.utils.json_to_sheet(gradebookRows);
  
  // Set column widths
  wsGradebook["!cols"] = [
    { wch: 6 },  // Rank
    { wch: 16 }, // Student ID
    { wch: 22 }, // Student Name
    { wch: 8 },  // Score
    { wch: 12 }, // Total Points
    { wch: 14 }, // Percentage
    { wch: 15 }, // Status
    { wch: 18 }, // Violations
    { wch: 15 }, // Flag
    { wch: 22 }, // Started
    { wch: 22 }, // Submitted
    { wch: 15 }, // Duration
  ];

  XLSX.utils.book_append_sheet(wb, wsGradebook, "Gradebook");

  // 2. Question Breakdown Sheet
  if (data.questionBreakdown && data.questionBreakdown.length > 0) {
    const breakdownRows = data.questionBreakdown.map((q) => ({
      "Student ID": q.studentIdNumber,
      "Student Name": q.studentName,
      "Q#": q.questionNumber,
      "Question Prompt": q.prompt,
      "Type": q.type,
      "Student Answer": q.studentAnswer,
      "Correct Answer(s)": q.correctAnswer,
      "Evaluation": q.matchType,
      "Points": q.pointsAwarded,
    }));

    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownRows);
    wsBreakdown["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 6 },
      { wch: 40 },
      { wch: 16 },
      { wch: 25 },
      { wch: 25 },
      { wch: 12 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Item Breakdown");
  }

  // 3. Cheating & Integrity Violation Log Sheet
  if (data.violations && data.violations.length > 0) {
    const violationRows = data.violations.map((v) => ({
      "Student ID": v.studentIdNumber,
      "Student Name": v.studentName,
      "Violation Event": v.eventType,
      "Details": v.details,
      "Timestamp": v.timestamp,
    }));

    const wsViolations = XLSX.utils.json_to_sheet(violationRows);
    wsViolations["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 35 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, wsViolations, "Cheating Audit Logs");
  }

  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return excelBuffer;
}
