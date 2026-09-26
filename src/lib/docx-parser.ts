import { QuestionDraft } from "@/types/quiz";

export interface DocxParseSummary {
  total: number;
  multipleChoice: number;
  trueFalse: number;
  shortAnswer: number;
  instructions: number;
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

type ParsedItem =
  | {
      kind: "INSTRUCTION";
      prompt: string;
    }
  | {
      kind: "QUESTION";
      block: RawQuestionBlock;
      sectionType: "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | null;
    };

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
 * Checks if a line is an exam header, personal student info/metadata, or formatting line to skip.
 */
function isIgnoredHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  const ignorePatterns = [
    // Student & exam form blanks
    /^(?:name|date|score|class|section|subject|teacher|instructor|grade|course|year|student\s*no|lrn|id\s*(?:no)?)\s*[:\.\-]/i,
    /^(?:name|date|score|class|section|subject|teacher|instructor|grade|course|year)\s*_{2,}/i,
    // School / college headers
    /^(?:college|university|department|school|institute|academy|faculty)\s+(?:of|in)\s+/i,
    /^(?:republic\s+of\s+the\s+philippines|deped|ched|senior\s+high\s+school|junior\s+high\s+school|elementary\s+school)/i,
    // Exam title / term banner
    /^(?:prelim|midterm|semi-final|final|finals|quarterly|diagnostic|periodical|summative)\s+(?:exam|examination|quiz|test|assessment)/i,
    /^quiz\s*#?\s*\d+/i,
    /^(?:first|second|third|fourth)\s+(?:grading|quarter|periodical)\s+(?:exam|examination|test)/i,
    // Formatting lines & notes
    /^[=\-_*~]{3,}$/,
    /^\(no\s+(?:answer|key)(?:\s+provided)?\)$/i,
    /^page\s+\d+(\s+of\s+\d+)?$/i,
    /^\d+\s*\/\s*\d+$/i,
  ];

  return ignorePatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks if a string is simply a blank for students to write on, e.g. "_________" or "...."
 */
function isBlankPlaceholder(text: string): boolean {
  const clean = text.trim();
  return /^[_.\s\-]{2,}$/.test(clean);
}

/**
 * Detects section headers like "Part II - True or False", "Test I: Multiple Choice", etc.
 */
function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^(?:part|test|section)\s+(?:[ivxlcdm]+|\d+|[a-z])\b/i.test(trimmed)) {
    return true;
  }

  if (
    /^(?:true\s*(?:\/|\s*or\s*)\s*false|multiple\s+choice|identification|enumeration|matching\s+type|short\s+answer|fill\s+in\s+the\s+blanks?|essay)[:\.\-]?$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Detects direction / instruction lines like "Directions: Write TRUE if...", "Write TRUE if...", etc.
 */
function isDirectionLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^(?:(?:general\s+)?(?:directions?|instructions?)|guidelines?)\s*[:\.\-]/i.test(trimmed)) {
    return true;
  }

  const directionPhrases = [
    /^write\s+(?:true|t)\s+if\s+.*(?:false|f)\s+if\s+/i,
    /^write\s+true\s+if\s+the\s+statement\s+is\s+correct/i,
    /^write\s+t\s+if\s+the\s+statement\s+is\s+true/i,
    /^write\s+(?:true\s+or\s+false|t\s+or\s+f)\b/i,
    /^(?:choose|select)\s+the\s+(?:letter\s+of\s+the\s+)?(?:best|correct)\s+answer/i,
    /^read\s+each\s+(?:statement|question)\s+carefully/i,
    /^write\s+the\s+(?:correct\s+)?(?:letter|name|word|term)\b/i,
    /^fill\s+in\s+the\s+blanks?\b/i,
    /^identify\s+what\s+is\s+being\s+described\b/i,
  ];

  return directionPhrases.some((p) => p.test(trimmed));
}

/**
 * Infers the active question type from section header or direction text
 */
function detectSectionType(text: string): "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | null {
  if (
    /\btrue\s*(?:\/|\s*or\s*)\s*false\b/i.test(text) ||
    /\bwrite\s+(?:true|t)\b/i.test(text) ||
    /\bt\s*\/\s*f\b/i.test(text)
  ) {
    return "TRUE_FALSE";
  }

  if (
    /\bmultiple\s+choice\b/i.test(text) ||
    /\bchoose\s+the\s+(?:letter|best|correct)\b/i.test(text)
  ) {
    return "MULTIPLE_CHOICE";
  }

  if (
    /\b(?:identification|short\s+answer|fill\s+in\s+the\s+blanks?|write\s+the\s+(?:correct\s+)?(?:term|word|name))\b/i.test(
      text
    )
  ) {
    return "SHORT_ANSWER";
  }

  return null;
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
 * Parses raw text extracted from a .docx file or pasted text into structured QuestionDraft objects.
 * Automatically recognizes section headers & directions, turns them into INSTRUCTION cards,
 * and uses section context (e.g. Part II - True or False) to correctly type questions without explicit options.
 */
export function parseDocxQuestions(rawText: string): DocxParseResult {
  const cleaned = cleanWordText(rawText);
  const rawLines = cleaned.split("\n").map((l) => l.trim());

  // Question numbering regex (supports "1. Prompt", "13) Prompt", "___ 13. Prompt", "( ) 13. Prompt", "Q13: Prompt")
  const questionNumberRegex = /^(?:(?:[_\.\s\-]{2,}|\([_\s]*\)|\b[A-Za-z]?\b[_\.\s]{2,})\s*)?(?:Q(?:uestion)?\s*)?(\d+)[\.\)\-:]\s*(.*)$/i;
  const singleOptionRegex = /^[\*•\-]?\s*\(?([A-Ha-h])\)?[.:\-]\s*(.*)$/i;
  const answerLineRegex = /^(?:Ans(?:wer)?|Key|Correct(?:\s*Answer)?|Key\s*Answer)[\s.:\-]+(.*)$/i;

  const items: ParsedItem[] = [];
  let currentBlock: RawQuestionBlock | null = null;
  let currentBlockSectionType: "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | null = null;
  let activeSectionType: "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | null = null;
  let pendingInstructionLines: string[] = [];

  const flushQuestion = () => {
    if (currentBlock) {
      items.push({
        kind: "QUESTION",
        block: currentBlock,
        sectionType: currentBlockSectionType,
      });
      currentBlock = null;
      currentBlockSectionType = null;
    }
  };

  const flushInstruction = () => {
    if (pendingInstructionLines.length > 0) {
      const text = pendingInstructionLines.join("\n").trim();
      if (text) {
        items.push({
          kind: "INSTRUCTION",
          prompt: text,
        });
      }
      pendingInstructionLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) continue;

    // 1. Skip personal metadata and overall exam document headers
    if (isIgnoredHeaderLine(line)) {
      continue;
    }

    // 2. Check if this line is a Section Header or Direction line
    const isSec = isSectionHeader(line);
    const isDir = isDirectionLine(line);

    if (isSec || isDir) {
      // Flush previous question if one was in progress
      flushQuestion();

      const detected = detectSectionType(line);
      if (detected) {
        activeSectionType = detected;
      }

      pendingInstructionLines.push(line);
      continue;
    }

    // 3. Check if line is a numbered question start
    const qMatch = line.match(questionNumberRegex);
    if (qMatch) {
      // Flush any pending instruction card (which immediately precedes this question)
      flushInstruction();
      // Flush previous question
      flushQuestion();

      currentBlock = {
        number: qMatch[1],
        promptLines: [qMatch[2].trim()],
        optionLines: [],
      };
      currentBlockSectionType = activeSectionType;
      continue;
    }

    // 4. If we are accumulating section instructions before the first question of this section:
    if (pendingInstructionLines.length > 0 && !currentBlock) {
      if (isBlankPlaceholder(line)) {
        continue;
      }
      const detected = detectSectionType(line);
      if (detected) {
        activeSectionType = detected;
      }
      pendingInstructionLines.push(line);
      continue;
    }

    // 5. If we have a current question block:
    if (currentBlock) {
      // Student answer line or key line
      const ansMatch = line.match(answerLineRegex);
      if (ansMatch) {
        const candidateAns = ansMatch[1].trim();
        if (!isBlankPlaceholder(candidateAns) && candidateAns.length > 0) {
          currentBlock.answerLine = candidateAns;
        }
        continue;
      }

      // Check for options (including horizontally stacked options)
      const horizontalSplit = splitHorizontalOptions(line);
      let allPartsAreOptions = true;

      for (const part of horizontalSplit) {
        if (!singleOptionRegex.test(part)) {
          allPartsAreOptions = false;
          break;
        }
      }

      if (allPartsAreOptions && horizontalSplit.length > 0) {
        currentBlock.optionLines.push(...horizontalSplit);
        continue;
      }

      // Single option line
      if (singleOptionRegex.test(line)) {
        currentBlock.optionLines.push(line);
        continue;
      }

      // Blank line placeholder on its own line: skip
      if (isBlankPlaceholder(line)) {
        continue;
      }

      // Continuation of prompt or choice
      if (currentBlock.optionLines.length === 0) {
        currentBlock.promptLines.push(line);
      } else {
        const lastIndex = currentBlock.optionLines.length - 1;
        currentBlock.optionLines[lastIndex] += " " + line;
      }
    }
  }

  // Flush remaining blocks
  flushInstruction();
  flushQuestion();

  // Fallback: If no numbered questions were found, check if there are paragraph questions ending with ?
  const questionCount = items.filter((it) => it.kind === "QUESTION").length;
  if (questionCount === 0) {
    for (const line of rawLines) {
      if (line && !isIgnoredHeaderLine(line) && line.endsWith("?")) {
        items.push({
          kind: "QUESTION",
          block: {
            promptLines: [line],
            optionLines: [],
          },
          sectionType: activeSectionType,
        });
      }
    }
  }

  // Convert parsed items to QuestionDraft[]
  const questions: QuestionDraft[] = [];

  for (const item of items) {
    if (item.kind === "INSTRUCTION") {
      questions.push({
        type: "INSTRUCTION",
        prompt: item.prompt,
        points: 0,
        options: [],
        correctAnswers: [],
        isCaseSensitive: false,
        allowFuzzy: false,
        fuzzyThreshold: 1,
      });
      continue;
    }

    const block = item.block;
    let prompt = block.promptLines
      .filter(Boolean)
      .join(" ")
      .replace(/Answer\s*:\s*[_.\s]*/gi, "")
      .replace(/_{3,}/g, "________")
      .trim();

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

    const isSectionTrueFalse = item.sectionType === "TRUE_FALSE" && rawOptions.length <= 2;

    if (isExplicitTrueFalseChoices || isPromptTrueFalse || isSectionTrueFalse || (isAnswerTrueFalse && rawOptions.length <= 2)) {
      type = "TRUE_FALSE";
      normalizedOptions.push("True", "False");

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
      type = "MULTIPLE_CHOICE";
      rawOptions.forEach((o) => normalizedOptions.push(o.text));

      let selectedOptionText = "";

      const marked = rawOptions.find((o) => o.isMarked);
      if (marked) {
        selectedOptionText = marked.text;
      }

      if (!selectedOptionText && block.answerLine) {
        const ans = block.answerLine.trim();
        const letterMatch = ans.match(/^([A-Ha-h])(?:[\.\)\-:]|$)/i);
        if (letterMatch) {
          const letter = letterMatch[1].toUpperCase();
          const targetOpt = rawOptions.find((o) => o.letter === letter);
          if (targetOpt) {
            selectedOptionText = targetOpt.text;
          }
        }

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
      type = "SHORT_ANSWER";

      if (block.answerLine) {
        const ans = block.answerLine.trim();
        if (ans && !isBlankPlaceholder(ans)) {
          correctAnswers.push(ans);
        }
      }
    }

    questions.push({
      type,
      prompt,
      points: 1,
      options: normalizedOptions,
      correctAnswers,
      isCaseSensitive: false,
      allowFuzzy: type === "SHORT_ANSWER",
      fuzzyThreshold: 1,
    });
  }

  const gradableQuestions = questions.filter((q) => q.type !== "INSTRUCTION");

  const summary: DocxParseSummary = {
    total: questions.length,
    multipleChoice: questions.filter((q) => q.type === "MULTIPLE_CHOICE").length,
    trueFalse: questions.filter((q) => q.type === "TRUE_FALSE").length,
    shortAnswer: questions.filter((q) => q.type === "SHORT_ANSWER").length,
    instructions: questions.filter((q) => q.type === "INSTRUCTION").length,
    withAnswers: gradableQuestions.filter((q) => q.correctAnswers.length > 0).length,
    withoutAnswers: gradableQuestions.filter((q) => q.correctAnswers.length === 0).length,
  };

  return {
    questions,
    summary,
    rawItemCount: questions.length,
  };
}
