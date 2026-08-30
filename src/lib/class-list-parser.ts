import * as XLSX from "xlsx";

export interface ParsedStudent {
  id: string;
  studentIdNumber: string;
  studentName: string;
  originalRowIndex: number;
  isDuplicateInFile?: boolean;
  isAlreadyEnrolled?: boolean;
  selected?: boolean;
}

export interface ParseResult {
  students: ParsedStudent[];
  subjectCodeHint?: string;
  subjectTitleHint?: string;
  instructorHint?: string;
  totalParsed: number;
  warnings: string[];
}

/**
 * Intelligent parser that extracts ONLY student ID number and student Name
 * from university/school class list spreadsheets (Excel .xlsx, .xls, CSV, or pasted text).
 * Handles institutional headers, section metadata, extra columns (Gender, Course, Phone, Email, Status),
 * and diverse column naming styles.
 */
export function parseClassListMatrix(matrix: any[][]): ParseResult {
  const warnings: string[] = [];
  let subjectCodeHint: string | undefined;
  let subjectTitleHint: string | undefined;
  let instructorHint: string | undefined;

  let headerRowIndex = -1;
  let idColIndex = -1;
  let nameColIndex = -1;

  // Patterns for matching ID & Name headers
  const idHeaderRegex = /^(id\s*number|idnumber|id_number|id\s*no\.?|student\s*id|stud_?id|id|id\s*#)$/i;
  const idLooseRegex = /id\s*number|idnumber|id_?no|student\s*id/i;

  const nameHeaderRegex = /^(fullname|full\s*name|student\s*name|stud_?name|name|student's\s*name|names)$/i;
  const nameLooseRegex = /fullname|full\s*name|student\s*name/i;

  // 1. Scan top rows for metadata (e.g., "Subject/Section :CS 314 - CS314D", "Descriptive Title :...")
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] || [];
    const rowText = row.map((c) => String(c ?? "").trim()).join(" ");

    if (!subjectCodeHint && /Subject\s*\/?\s*Section\s*[:\-]\s*([A-Za-z0-9\s\-]+)/i.test(rowText)) {
      const match = rowText.match(/Subject\s*\/?\s*Section\s*[:\-]\s*([A-Za-z0-9\s\-]+)/i);
      if (match) subjectCodeHint = match[1].trim();
    }
    if (!subjectTitleHint && /Descriptive\s*Title\s*[:\-]\s*([A-Za-z0-9\s\-]+)/i.test(rowText)) {
      const match = rowText.match(/Descriptive\s*Title\s*[:\-]\s*([A-Za-z0-9\s\-]+)/i);
      if (match) subjectTitleHint = match[1].trim();
    }
    if (!instructorHint && /Instructor\(?s?\)?\s*[:\-]\s*([A-Za-z0-9\s\-.,]+)/i.test(rowText)) {
      const match = rowText.match(/Instructor\(?s?\)?\s*[:\-]\s*([A-Za-z0-9\s\-.,]+)/i);
      if (match) instructorHint = match[1].trim();
    }

    // Check if this row is the column header row
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] ?? "").trim();
      if (!cellVal) continue;

      if (idColIndex === -1 && (idHeaderRegex.test(cellVal) || idLooseRegex.test(cellVal))) {
        idColIndex = c;
      }
      if (nameColIndex === -1 && (nameHeaderRegex.test(cellVal) || nameLooseRegex.test(cellVal))) {
        nameColIndex = c;
      }
    }

    // If we found both column headers in this row
    if (idColIndex !== -1 && nameColIndex !== -1) {
      headerRowIndex = r;
      break;
    }

    // Reset if only one found on an irrelevant row
    if (idColIndex === -1 || nameColIndex === -1) {
      idColIndex = -1;
      nameColIndex = -1;
    }
  }

  // Fallback: If no explicit header row was identified, attempt heuristic column detection
  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  if (idColIndex === -1 || nameColIndex === -1) {
    warnings.push("Header row not explicitly labeled; using heuristic column detection.");
    
    // Check first 5 non-empty data rows: Col 0 is usually ID (digits/alphanumeric), Col 1 is Name
    let col0IsId = 0;
    let col1IsName = 0;
    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
      const row = matrix[r] || [];
      const col0 = String(row[0] ?? "").trim();
      const col1 = String(row[1] ?? "").trim();

      if (/^[A-Za-z0-9\-]{4,15}$/.test(col0)) col0IsId++;
      if (/[A-Za-z]{2,}/.test(col1)) col1IsName++;
    }

    if (col0IsId >= 2 && col1IsName >= 2) {
      idColIndex = 0;
      nameColIndex = 1;
    } else {
      // Default to columns 0 and 1
      idColIndex = 0;
      nameColIndex = 1;
    }
  }

  const rawStudents: ParsedStudent[] = [];
  const seenIds = new Set<string>();

  // 2. Iterate through data rows and extract ONLY student ID & student Name
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] || [];
    if (row.length === 0) continue;

    let idVal = String(row[idColIndex] ?? "").trim();
    let nameVal = String(row[nameColIndex] ?? "").trim();

    // Skip empty lines
    if (!idVal && !nameVal) continue;

    // Skip repeat headers or summary/footer lines (e.g., "Total Students", "Male:", "Female:", "Instructor Signature")
    if (
      /total|instructor|signature|page\s*\d|printed|campus|surigao|university/i.test(idVal) ||
      /total|instructor|signature|page\s*\d/i.test(nameVal)
    ) {
      continue;
    }

    // Validate ID format (alphanumeric string with no spaces or commas, length >= 3)
    // If ID value has decimals like 1006261.0 from Excel numeric formatting, strip decimal
    idVal = idVal.replace(/\.0+$/, "").trim().toUpperCase();

    // If ID is not valid or empty, check if it's a valid row
    if (!idVal || idVal.length < 3 || idVal.length > 30) {
      continue;
    }

    // Name cleanup: remove stray quotes or excessive spacing
    nameVal = nameVal.replace(/\s+/g, " ").trim();
    if (!nameVal) {
      nameVal = "Student " + idVal;
    }

    const isDuplicateInFile = seenIds.has(idVal);
    seenIds.add(idVal);

    rawStudents.push({
      id: `parsed_${r}_${idVal}`,
      studentIdNumber: idVal,
      studentName: nameVal,
      originalRowIndex: r + 1,
      isDuplicateInFile,
      selected: !isDuplicateInFile, // Auto-select non-duplicates
    });
  }

  return {
    students: rawStudents,
    subjectCodeHint,
    subjectTitleHint,
    instructorHint,
    totalParsed: rawStudents.length,
    warnings,
  };
}

/**
 * Parses an uploaded File (Excel .xlsx, .xls, or .csv) in browser memory
 */
export async function parseClassListFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Read the first worksheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Uploaded workbook contains no readable worksheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  // Convert sheet to 2D array matrix of cell values
  const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return parseClassListMatrix(matrix);
}

/**
 * Parses raw copied/pasted text from Excel or CSV
 */
export function parseClassListText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const matrix: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // Check if tab-separated (standard Excel copy-paste) or comma-separated
    if (line.includes("\t")) {
      matrix.push(line.split("\t").map((c) => c.trim()));
    } else if (line.includes(",")) {
      matrix.push(line.split(",").map((c) => c.trim()));
    } else {
      // Single column
      matrix.push([line.trim()]);
    }
  }

  return parseClassListMatrix(matrix);
}
