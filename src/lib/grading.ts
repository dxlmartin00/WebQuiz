/**
 * Automated Grading & Answer Matching Engine
 * Implements exact match, synonym arrays, normalization, strict case matching,
 * and Levenshtein Distance fuzzy matching for Identification/Short Answer questions.
 */

export interface QuestionGradingRule {
  type: string; // "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER"
  points: number;
  correctAnswers: string[]; // JSON array of valid strings / synonyms
  isCaseSensitive?: boolean;
  allowFuzzy?: boolean;
  fuzzyThreshold?: number; // Max Levenshtein distance allowed (default 1)
}

export interface EvaluationResult {
  isCorrect: boolean;
  pointsAwarded: number;
  matchType: "EXACT" | "SYNONYM" | "FUZZY" | "INCORRECT";
  matchedAnswer?: string;
}

/**
 * Normalizes text by trimming ends and collapsing internal multiple whitespaces
 */
export function normalizeText(text: string, isCaseSensitive = false): string {
  if (!text) return "";
  let clean = text.trim().replace(/\s+/g, " ");
  if (!isCaseSensitive) {
    clean = clean.toLowerCase();
  }
  return clean;
}

/**
 * Computes standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Evaluates a student's answer against a question's grading rules
 */
export function evaluateAnswer(
  studentAnswer: string | undefined | null,
  rule: QuestionGradingRule
): EvaluationResult {
  const rawStudent = studentAnswer ?? "";
  const points = rule.points > 0 ? rule.points : 1;

  if (!rawStudent.trim()) {
    return {
      isCorrect: false,
      pointsAwarded: 0,
      matchType: "INCORRECT",
    };
  }

  // MULTIPLE_CHOICE or TRUE_FALSE
  if (rule.type === "MULTIPLE_CHOICE" || rule.type === "TRUE_FALSE") {
    const normStudent = rawStudent.trim().toLowerCase();
    const isCorrect = rule.correctAnswers.some(
      (ans) => ans.trim().toLowerCase() === normStudent
    );

    return {
      isCorrect,
      pointsAwarded: isCorrect ? points : 0,
      matchType: isCorrect ? "EXACT" : "INCORRECT",
      matchedAnswer: isCorrect ? rawStudent.trim() : undefined,
    };
  }

  // SHORT_ANSWER / IDENTIFICATION
  const isCaseSensitive = !!rule.isCaseSensitive;
  const normStudent = normalizeText(rawStudent, isCaseSensitive);

  if (rule.correctAnswers.length === 0) {
    return {
      isCorrect: false,
      pointsAwarded: 0,
      matchType: "INCORRECT",
    };
  }

  // 1. Exact Match Check (Primary or Synonym)
  for (let i = 0; i < rule.correctAnswers.length; i++) {
    const rawTarget = rule.correctAnswers[i];
    const normTarget = normalizeText(rawTarget, isCaseSensitive);

    if (normStudent === normTarget) {
      return {
        isCorrect: true,
        pointsAwarded: points,
        matchType: i === 0 ? "EXACT" : "SYNONYM",
        matchedAnswer: rawTarget,
      };
    }
  }

  // 2. Fuzzy Match Check (if enabled)
  if (rule.allowFuzzy) {
    const maxThreshold = rule.fuzzyThreshold ?? 1;

    for (const rawTarget of rule.correctAnswers) {
      const normTarget = normalizeText(rawTarget, isCaseSensitive);

      // Only allow fuzzy matching if length is at least 4 characters to prevent false positives
      if (normTarget.length >= 4) {
        const dist = levenshteinDistance(normStudent, normTarget);
        if (dist <= maxThreshold) {
          return {
            isCorrect: true,
            pointsAwarded: points,
            matchType: "FUZZY",
            matchedAnswer: rawTarget,
          };
        }
      }
    }
  }

  return {
    isCorrect: false,
    pointsAwarded: 0,
    matchType: "INCORRECT",
  };
}
