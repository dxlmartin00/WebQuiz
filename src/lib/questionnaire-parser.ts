import { QuestionDraft } from "@/types/quiz";

/**
 * Checks if a line is a section header, instruction, or metadata rather than a question prompt.
 */
function isNoiseOrHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Header patterns
  const headerPatterns = [
    /^(Part\s+[IVXLCDM\d]+|Test\s+[IVXLCDM\d]+|Section\s+[IVXLCDM\d]+)/i,
    /^(Multiple\s+Choice|Identification|True\s+or\s+False|Matching\s+Type|Fill\s+in\s+the\s+Blanks?)/i,
    /^(Choose\s+the\s+best|Write\s+the\s+(name|correct|letter)|Select\s+the|Directions?:|Instructions?:)/i,
    /^(Name\s*:|Date\s*:|Score\s*:|Grade\s*&?\s*Section\s*:|Subject\s*:|Teacher\s*:|Instructor\s*:)/i,
    /^(Page\s+\d+(\s+of\s+\d+)?|\d+\s*\/\s*\d+)$/i,
    /^(Midterm|Final|Pre-Final|Quiz\s*#?\d*|Examination|Assessment)/i,
    /^[_\-\=\*\s]{4,}$/, // separator lines
  ];

  return headerPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks if a line is an answer key or blank line like "Answer: _________"
 */
function isAnswerBlankLine(line: string): boolean {
  const trimmed = line.trim();
  return /^(Answer\s*:|Ans\s*:|Key\s*:)\s*[_.\s]*$/i.test(trimmed) || /^[_.\s]{3,}$/.test(trimmed);
}

/**
 * Splits a single line if it contains multiple inline choices like "A. Move   B. Pen   C. Hand   D. Text"
 */
function extractInlineOptions(line: string): string[] | null {
  // Check if multiple choices (e.g. A. ... B. ...) appear in the same line
  const matches = [...line.matchAll(/(?:^|\s+)([A-Ea-e])[\.\)]\s+([^\n\r\t]+?)(?=(?:\s+[A-Ea-e][\.\)]|$))/g)];
  if (matches.length >= 2) {
    return matches.map((m) => m[2].trim());
  }
  return null;
}

/**
 * Parses raw text extracted from Word documents (.docx), text files, or direct paste.
 */
export function parseQuestionnaireText(rawText: string): QuestionDraft[] {
  if (!rawText || typeof rawText !== "string") return [];

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());
  const questions: QuestionDraft[] = [];

  let currentPrompt = "";
  let currentOptions: string[] = [];
  let currentAnswers: string[] = [];

  const questionStartRegex = /^(?:(?:Question|Q\.?)\s*)?(\d+)[\.\:\)]\s*(.*)$/i;
  const singleOptionRegex = /^([A-Ea-e])[\.\)]\s*(.*)$/;
  const parenOptionRegex = /^\(([A-Ea-e])\)\s*(.*)$/;

  const flushQuestion = () => {
    if (!currentPrompt.trim()) return;

    // Clean up prompt
    let cleanPrompt = currentPrompt
      .replace(/Answer\s*:\s*[_.\s]*/gi, "")
      .replace(/Ans\s*:\s*[_.\s]*/gi, "")
      .replace(/_{3,}/g, "________")
      .trim();

    if (!cleanPrompt) return;

    // Determine type
    let type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" = "SHORT_ANSWER";

    if (currentOptions.length >= 2) {
      const lowerOptions = currentOptions.map((o) => o.toLowerCase());
      if (
        (lowerOptions.includes("true") && lowerOptions.includes("false")) ||
        (lowerOptions.includes("t") && lowerOptions.includes("f") && lowerOptions.length === 2)
      ) {
        type = "TRUE_FALSE";
        currentOptions = ["True", "False"];
      } else {
        type = "MULTIPLE_CHOICE";
      }
    } else {
      // Check if prompt says "True or False"
      if (/\b(true\s+or\s+false)\b/i.test(cleanPrompt)) {
        type = "TRUE_FALSE";
        currentOptions = ["True", "False"];
      } else {
        type = "SHORT_ANSWER";
        currentOptions = [];
      }
    }

    questions.push({
      type,
      prompt: cleanPrompt,
      points: 1,
      options: currentOptions,
      correctAnswers: currentAnswers, // Instructors can set or select answers in the UI
      isCaseSensitive: false,
      allowFuzzy: type === "SHORT_ANSWER",
      fuzzyThreshold: 1,
    });

    currentPrompt = "";
    currentOptions = [];
    currentAnswers = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    // 1. Check for Question Number Start (e.g. "1. What is..." or "21. This tool...")
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      flushQuestion();
      currentPrompt = qMatch[2].trim();

      // Check if question prompt also contains inline options on the very same line
      const inlineOpts = extractInlineOptions(currentPrompt);
      if (inlineOpts) {
        // Strip options from prompt
        currentPrompt = currentPrompt.replace(/(?:^|\s+)[A-Ea-e][\.\)].*$/, "").trim();
        currentOptions = inlineOpts;
      }
      continue;
    }

    // If we haven't encountered any question yet, skip noise/headers
    if (!currentPrompt) {
      continue;
    }

    // 2. Check for Inline Options on this line
    const inline = extractInlineOptions(line);
    if (inline) {
      currentOptions.push(...inline);
      continue;
    }

    // 3. Check for Standard Single Option (e.g. "A. Move Tool" or "(A) Move Tool")
    const optMatch = line.match(singleOptionRegex) || line.match(parenOptionRegex);
    if (optMatch) {
      currentOptions.push(optMatch[2].trim());
      continue;
    }

    // 4. Check for Answer line (e.g. "Answer: _________")
    if (isAnswerBlankLine(line)) {
      continue;
    }

    // 5. Check if it's a section header interrupting questions
    if (isNoiseOrHeader(line)) {
      flushQuestion();
      continue;
    }

    // 6. Continuation of prompt or multi-line option
    if (currentOptions.length === 0) {
      // Prompt continuation (e.g. wrapped lines)
      currentPrompt += " " + line;
    } else {
      // Append to the last option if wrapped
      currentOptions[currentOptions.length - 1] += " " + line;
    }
  }

  flushQuestion();
  return questions;
}
