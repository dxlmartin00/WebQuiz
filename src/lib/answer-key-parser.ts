import { QuestionDraft } from "@/types/quiz";

export interface ParsedAnswerKeyItem {
  questionNumber: number;
  rawAnswer: string;
}

export interface MatchedKeyResult {
  questionIndex: number;
  questionNumber: number;
  prompt: string;
  type: string;
  options: string[];
  rawKey: string;
  resolvedAnswer: string | null;
  isMatched: boolean;
  reason?: string;
}

/**
 * Parses raw text extracted from text files, Word documents, or direct paste to find answer keys.
 * Supports:
 * - 1. A, 2. B, 3. True, 4. Photosynthesis
 * - 1) A, 2) B
 * - 1: A, 2: B
 * - 1 - A, 2 - B
 * - Item 1: A, Question 1: B, Q1. A
 * - Comma-delimited list: 1. A, 2. B, 3. C
 * - Plain list of letters or words: A \n B \n C \n D...
 */
export function parseAnswerKeyText(rawText: string): ParsedAnswerKeyItem[] {
  if (!rawText || typeof rawText !== "string") return [];

  const items: ParsedAnswerKeyItem[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Pattern 1: Explicit numbered pattern (e.g. "1. A", "Q1: True", "Item 1 - B", "1) Photosynthesis")
  const numberedRegex = /(?:(?:Question|Item|Q\.?)\s*)?(\d+)[\.\:\)\-\=\,\s]+([^\,\;\n\r\t]+)/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    let foundInLine = false;

    // First try regex matching across the line (supports multiple on one line like "1. A  2. B  3. C")
    while ((match = numberedRegex.exec(line)) !== null) {
      const qNum = parseInt(match[1], 10);
      let ans = match[2].trim();

      // Clean up answer if next number accidentally matched
      ans = ans.replace(/\s+(?:Question|Item|Q\.?)?\d+[\.\:\)\-].*$/i, "").trim();

      if (!isNaN(qNum) && ans) {
        items.push({
          questionNumber: qNum,
          rawAnswer: ans,
        });
        foundInLine = true;
      }
    }

    // If no numbered match on this line, check if the line is comma-separated answers (e.g. "A, B, C, True, D")
    if (!foundInLine && line.includes(",")) {
      const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const subMatch = /(?:(?:Question|Item|Q\.?)\s*)?(\d+)[\.\:\)\-\=\s]+(.+)/i.exec(part);
        if (subMatch) {
          items.push({
            questionNumber: parseInt(subMatch[1], 10),
            rawAnswer: subMatch[2].trim(),
          });
        }
      }
    }
  }

  // Fallback pattern: If no numbered keys were found at all, but the input is a list of sequential lines (e.g. line 1 = "A", line 2 = "C", line 3 = "True")
  if (items.length === 0 && lines.length > 0) {
    let sequentialNum = 1;
    for (const line of lines) {
      // Ignore header lines like "Answer Key", "Answers:", etc.
      if (/^(Answer\s*Key|Answers?|Key|Solutions?):?$/i.test(line)) continue;

      items.push({
        questionNumber: sequentialNum++,
        rawAnswer: line.trim(),
      });
    }
  }

  // Sort by question number
  return items.sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * Matches parsed answer keys against existing draft questions in the quiz builder.
 */
export function matchAnswerKeysToQuestions(
  questions: QuestionDraft[],
  keys: ParsedAnswerKeyItem[]
): MatchedKeyResult[] {
  const keyMap = new Map<number, string>();
  for (const k of keys) {
    keyMap.set(k.questionNumber, k.rawAnswer);
  }

  return questions.map((q, idx) => {
    const questionNumber = idx + 1;
    const rawKey = keyMap.get(questionNumber) || "";

    if (!rawKey) {
      return {
        questionIndex: idx,
        questionNumber,
        prompt: q.prompt,
        type: q.type,
        options: q.options || [],
        rawKey: "",
        resolvedAnswer: null,
        isMatched: false,
        reason: "No answer key found for this question number",
      };
    }

    let resolvedAnswer: string | null = null;
    let isMatched = false;
    let reason: string | undefined;

    const trimmedKey = rawKey.trim();

    if (q.type === "MULTIPLE_CHOICE") {
      const options = q.options || [];

      // Case A: Letter reference (A, B, C, D, E)
      const letterMatch = /^[A-Ea-e]$/.exec(trimmedKey);
      if (letterMatch) {
        const charCode = letterMatch[0].toUpperCase().charCodeAt(0);
        const optIndex = charCode - 65; // A=0, B=1, C=2, D=3, E=4

        if (optIndex >= 0 && optIndex < options.length) {
          resolvedAnswer = options[optIndex];
          isMatched = true;
        } else {
          reason = `Option letter (${letterMatch[0].toUpperCase()}) is out of bounds for ${options.length} choices`;
        }
      } else {
        // Case B: Full text match against one of the choices
        const exactMatch = options.find(
          (opt) => opt.trim().toLowerCase() === trimmedKey.toLowerCase()
        );
        if (exactMatch) {
          resolvedAnswer = exactMatch;
          isMatched = true;
        } else {
          // If no option matched text, see if it starts with letter (e.g., "A. Blue")
          const prefixMatch = /^[A-Ea-e][\.\:\)\s]+(.+)$/.exec(trimmedKey);
          if (prefixMatch) {
            const letter = prefixMatch[0][0].toUpperCase();
            const optIndex = letter.charCodeAt(0) - 65;
            if (optIndex >= 0 && optIndex < options.length) {
              resolvedAnswer = options[optIndex];
              isMatched = true;
            }
          }

          if (!resolvedAnswer) {
            reason = `Answer "${trimmedKey}" does not match any of the ${options.length} options`;
          }
        }
      }
    } else if (q.type === "TRUE_FALSE") {
      const lower = trimmedKey.toLowerCase();
      if (lower === "true" || lower === "t" || lower === "1") {
        resolvedAnswer = "True";
        isMatched = true;
      } else if (lower === "false" || lower === "f" || lower === "0") {
        resolvedAnswer = "False";
        isMatched = true;
      } else {
        reason = `Expected True or False, got "${trimmedKey}"`;
      }
    } else if (q.type === "SHORT_ANSWER") {
      resolvedAnswer = trimmedKey;
      isMatched = true;
    } else if (q.type === "INSTRUCTION") {
      isMatched = false;
      reason = "Instruction cards do not require an answer key";
    }

    return {
      questionIndex: idx,
      questionNumber,
      prompt: q.prompt,
      type: q.type,
      options: q.options || [],
      rawKey,
      resolvedAnswer,
      isMatched,
      reason,
    };
  });
}
