import { QuestionDraft } from "@/types/quiz";

export interface DocxParseSummary {
  total: number;
  multipleChoice: number;
  trueFalse: number;
  shortAnswer: number;
  withAnswers: number;
  withoutAnswers: number;
}

export interface DocxParseResult {
  questions: QuestionDraft[];
  summary: DocxParseSummary;
  rawItemCount: number;
}

interface RawQuestionBlock {
  number?: string;
  promptLines: string[];
  optionLines: string[];
  answerLine?: string;
}

/**
 * Normalizes text from Word documents:
 * - Replaces curly/smart quotes with standard quotes
 * - Replaces non-breaking spaces with standard spaces
 * - Replaces various dashes with standard hyphens
 */
export function cleanWordText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/**
 * Checks if a line is an exam header, title, or directions to skip
 */
function isIgnoredHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  const ignorePatterns = [
    /^(?:test|part|section)\s+[ivxlcdm0-9]+[:\.\-]?\s*.*$/i,
    /^(?:multiple choice|true or false|identification|enumeration|matching type|short answer|essay)[:\.\-]?\s*.*$/i,
    /^(?:directions?|instructions?|general directions?)[:\.\-]?\s*.*$/i,
    /^(?:name|date|score|class|section|subject|teacher|grade|course|year)[:\.\-]?\s*_{2,}.*$/i,
    /^(?:name|date|score|class|section|subject|teacher|grade|course|year)\s*:.*$/i,
    /^(?:prelim|midterm|semi-final|final|finals|quarterly|diagnostic)\s+(?:exam|examination|quiz|test|assessment).*$/i,
    /^(?:college|university|department|school|institute|academy)\s+of\s+.*$/i,
    /^[=\-_*~]{3,}$/,
    /^\(no\s+(?:answer|key)(?:\s+provided)?\)$/i,
  ];

  return ignorePatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Splits a line that might contain horizontally placed multiple-choice options,
 * e.g., "A. Option 1   B. Option 2   C. Option 3   D. Option 4"
 */
function splitHorizontalOptions(line: string): string[] {
  const regex = /(?:^|\s{2,}|\t+)(?:[\*•\-]?\s*\(?([A-Ha-h])\)?[.:\-])\s+/g;
  const matches: { index: number; marker: string }[] = [];
  let match;

  while ((match = regex.exec(line)) !== null) {
    matches.push({ index: match.index, marker: match[0] });
  }

  if (matches.length >= 2) {
    const results: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
      const part = line.slice(start, end).trim();
      if (part) results.push(part);
    }
    return results;
  }

  return [line];
}

/**
 * Parses raw text extracted from a .docx file into structured QuestionDraft objects.
 */
export function parseDocxQuestions(rawText: string): DocxParseResult {
  const cleaned = cleanWordText(rawText);
  const rawLines = cleaned.split("\n").map((l) => l.trim());

  // Patterns
  const questionNumberRegex = /^(?:Q(?:uestion)?\s*)?(\d+)[\.\)\-:]\s*(.*)$/i;
  const singleOptionRegex = /^[\*•\-]?\s*\(?([A-Ha-h])\)?[.:\-]\s*(.*)$/i;
  const answerLineRegex = /^(?:Ans(?:wer)?|Key|Correct(?:\s*Answer)?|Key\s*Answer)[\s.:\-]+(.*)$/i;

  const blocks: RawQuestionBlock[] = [];
  let currentBlock: RawQuestionBlock | null = null;
  let hasEncounteredNumberedQuestion = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    // Check if line is a question start: "1. Prompt...", "1) Prompt...", "Q1: Prompt..."
    const qMatch = line.match(questionNumberRegex);

    if (qMatch) {
      hasEncounteredNumberedQuestion = true;
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        number: qMatch[1],
        promptLines: [qMatch[2].trim()],
        optionLines: [],
      };
      continue;
    }

    // If we haven't encountered any numbered question yet, all lines are header/instructions/metadata
    if (!hasEncounteredNumberedQuestion) {
      // Skip headers, titles, subject info, etc.
      continue;
    }

    // We have an active block:
    // 1. Check for Answer line
    const ansMatch = line.match(answerLineRegex);
    if (ansMatch) {
      currentBlock!.answerLine = ansMatch[1].trim();
      continue;
    }

    // 2. Check for options (including horizontally stacked options)
    const horizontalSplit = splitHorizontalOptions(line);
    let allPartsAreOptions = true;

    for (const part of horizontalSplit) {
      if (!singleOptionRegex.test(part)) {
        allPartsAreOptions = false;
        break;
      }
    }

    if (allPartsAreOptions && horizontalSplit.length > 0) {
      currentBlock!.optionLines.push(...horizontalSplit);
      continue;
    }

    // 3. Single option line
    if (singleOptionRegex.test(line)) {
      currentBlock!.optionLines.push(line);
      continue;
    }

    // 4. Ignored section or test headers in the middle of document
    if (isIgnoredHeaderLine(line)) {
      continue;
    }

    // 5. Continuation of prompt or choice
    if (currentBlock!.optionLines.length === 0) {
      currentBlock!.promptLines.push(line);
    } else {
      // Continuation of previous option
      const lastIndex = currentBlock!.optionLines.length - 1;
      currentBlock!.optionLines[lastIndex] += " " + line;
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Fallback: If no numbered questions were found, check if there are paragraph questions (e.g. ending with ?)
  if (blocks.length === 0) {
    for (const line of rawLines) {
      if (line && !isIgnoredHeaderLine(line) && line.endsWith("?")) {
        blocks.push({
          promptLines: [line],
          optionLines: [],
        });
      }
    }
  }

  // Convert raw question blocks to QuestionDraft[]
  const questions: QuestionDraft[] = [];

  for (const block of blocks) {
    const prompt = block.promptLines.filter(Boolean).join(" ").trim();
    if (!prompt) continue;

    const rawOptions: { letter: string; text: string; isMarked: boolean }[] = [];

    for (const optLine of block.optionLines) {
      const isMarked = optLine.startsWith("*") || /\(correct\)|\[correct\]/i.test(optLine);
      const cleanedOpt = optLine
        .replace(/^\*/, "")
        .replace(/\((?:correct)\)|\[(?:correct)\]/gi, "")
        .replace(/\((?:no\s+answer.*|teacher.*)\)/gi, "")
        .trim();
      const m = cleanedOpt.match(/^[\*•\-]?\s*\(?([A-Ha-h])\)?[.:\-]\s*(.*)$/i);

      if (m) {
        rawOptions.push({
          letter: m[1].toUpperCase(),
          text: m[2].trim(),
          isMarked,
        });
      } else if (cleanedOpt) {
        rawOptions.push({
          letter: String.fromCharCode(65 + rawOptions.length),
          text: cleanedOpt,
          isMarked,
        });
      }
    }

    // Determine Question Type
    let type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" = "SHORT_ANSWER";
    const normalizedOptions: string[] = [];
    const correctAnswers: string[] = [];

    const isExplicitTrueFalseChoices =
      rawOptions.length === 2 &&
      rawOptions.some((o) => /^true$/i.test(o.text) || /^t$/i.test(o.text)) &&
      rawOptions.some((o) => /^false$/i.test(o.text) || /^f$/i.test(o.text));

    const isPromptTrueFalse =
      /\btrue\s+or\s+false\b/i.test(prompt) ||
      /\((?:true\/false|t\/f)\)/i.test(prompt) ||
      /^(?:true\s+or\s+false|t\s*\/\s*f)[:\.\-]/i.test(prompt);

    const isAnswerTrueFalse =
      block.answerLine !== undefined &&
      /^(?:true|false|t|f)$/i.test(block.answerLine.trim());

    if (isExplicitTrueFalseChoices || isPromptTrueFalse || (isAnswerTrueFalse && rawOptions.length <= 2)) {
      // TRUE_FALSE question
      type = "TRUE_FALSE";
      normalizedOptions.push("True", "False");

      // Determine answer if available
      let detectedTF = "";
      if (block.answerLine) {
        const trimmedAns = block.answerLine.trim();
        if (/^(?:true|t|a)$/i.test(trimmedAns)) detectedTF = "True";
        else if (/^(?:false|f|b)$/i.test(trimmedAns)) detectedTF = "False";
      }

      if (!detectedTF) {
        const marked = rawOptions.find((o) => o.isMarked);
        if (marked) {
          if (/^true$/i.test(marked.text) || marked.letter === "A") detectedTF = "True";
          else if (/^false$/i.test(marked.text) || marked.letter === "B") detectedTF = "False";
        }
      }

      if (detectedTF) {
        correctAnswers.push(detectedTF);
      }
    } else if (rawOptions.length >= 2) {
      // MULTIPLE_CHOICE question
      type = "MULTIPLE_CHOICE";
      rawOptions.forEach((o) => normalizedOptions.push(o.text));

      // Resolve Answer
      let selectedOptionText = "";

      // 1. Check if an option was marked with asterisk or (correct)
      const marked = rawOptions.find((o) => o.isMarked);
      if (marked) {
        selectedOptionText = marked.text;
      }

      // 2. Check if answer line was specified, e.g. "Answer: B" or "Answer: London"
      if (!selectedOptionText && block.answerLine) {
        const ans = block.answerLine.trim();
        // Check single letter: A, B, C...
        const letterMatch = ans.match(/^([A-Ha-h])(?:[\.\)\-:]|$)/i);
        if (letterMatch) {
          const letter = letterMatch[1].toUpperCase();
          const targetOpt = rawOptions.find((o) => o.letter === letter);
          if (targetOpt) {
            selectedOptionText = targetOpt.text;
          }
        }

        // Check exact or partial text match with options
        if (!selectedOptionText) {
          const matchingOpt = rawOptions.find(
            (o) =>
              o.text.toLowerCase() === ans.toLowerCase() ||
              ans.toLowerCase().includes(o.text.toLowerCase())
          );
          if (matchingOpt) {
            selectedOptionText = matchingOpt.text;
          }
        }
      }

      if (selectedOptionText) {
        correctAnswers.push(selectedOptionText);
      }
    } else {
      // SHORT_ANSWER question
      type = "SHORT_ANSWER";

      // If answer line is present, use it as correct answer
      if (block.answerLine) {
        const ans = block.answerLine.trim();
        if (ans) {
          correctAnswers.push(ans);
        }
      }
    }

    questions.push({
      type,
      prompt,
      points: type === "SHORT_ANSWER" ? 2 : 1,
      options: normalizedOptions,
      correctAnswers,
      isCaseSensitive: false,
      allowFuzzy: type === "SHORT_ANSWER",
      fuzzyThreshold: 1,
    });
  }

  const summary: DocxParseSummary = {
    total: questions.length,
    multipleChoice: questions.filter((q) => q.type === "MULTIPLE_CHOICE").length,
    trueFalse: questions.filter((q) => q.type === "TRUE_FALSE").length,
    shortAnswer: questions.filter((q) => q.type === "SHORT_ANSWER").length,
    withAnswers: questions.filter((q) => q.correctAnswers.length > 0).length,
    withoutAnswers: questions.filter((q) => q.correctAnswers.length === 0).length,
  };

  return {
    questions,
    summary,
    rawItemCount: blocks.length,
  };
}
