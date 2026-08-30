export interface QuestionDraft {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  prompt: string;
  points: number;
  options: string[];
  correctAnswers: string[];
  isCaseSensitive: boolean;
  allowFuzzy: boolean;
  fuzzyThreshold: number;
}
