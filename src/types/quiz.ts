export interface QuestionDraft {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "INSTRUCTION";
  prompt: string;
  points: number;
  options: string[];
  correctAnswers: string[];
  isCaseSensitive: boolean;
  allowFuzzy: boolean;
  fuzzyThreshold: number;
}
