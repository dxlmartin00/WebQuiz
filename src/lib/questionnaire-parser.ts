import { QuestionDraft } from "@/types/quiz";
import { parseDocxQuestions } from "@/lib/docx-parser";

/**
 * Parses raw text extracted from Word documents (.docx), text files, or direct paste.
 * Delegates to parseDocxQuestions for unified section detection, INSTRUCTION card generation,
 * and context-aware True/False question extraction.
 */
export function parseQuestionnaireText(rawText: string): QuestionDraft[] {
  if (!rawText || typeof rawText !== "string") return [];
  const result = parseDocxQuestions(rawText);
  return result.questions;
}
