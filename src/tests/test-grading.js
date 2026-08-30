/**
 * Verification test suite for Automated Grading & Answer Matching Engine
 */

function normalizeText(text, isCaseSensitive = false) {
  if (!text) return "";
  let clean = text.trim().replace(/\s+/g, " ");
  if (!isCaseSensitive) {
    clean = clean.toLowerCase();
  }
  return clean;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function evaluateAnswer(studentAnswer, rule) {
  const rawStudent = studentAnswer ?? "";
  const points = rule.points > 0 ? rule.points : 1;

  if (!rawStudent.trim()) {
    return { isCorrect: false, pointsAwarded: 0, matchType: "INCORRECT" };
  }

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

  const isCaseSensitive = !!rule.isCaseSensitive;
  const normStudent = normalizeText(rawStudent, isCaseSensitive);

  if (rule.correctAnswers.length === 0) {
    return { isCorrect: false, pointsAwarded: 0, matchType: "INCORRECT" };
  }

  // 1. Exact Match Check
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

  // 2. Fuzzy Match Check
  if (rule.allowFuzzy) {
    const maxThreshold = rule.fuzzyThreshold ?? 1;
    for (const rawTarget of rule.correctAnswers) {
      const normTarget = normalizeText(rawTarget, isCaseSensitive);
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

  return { isCorrect: false, pointsAwarded: 0, matchType: "INCORRECT" };
}

// Test cases
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log("Running Grading Engine Verification Tests...\n");

// Test 1: Multiple Choice Exact Match
{
  const rule = {
    type: "MULTIPLE_CHOICE",
    points: 2,
    correctAnswers: ["ALU (Arithmetic Logic Unit)"],
  };
  const res1 = evaluateAnswer("ALU (Arithmetic Logic Unit)", rule);
  assert(res1.isCorrect && res1.pointsAwarded === 2 && res1.matchType === "EXACT", "MCQ correct choice award 2 points");

  const res2 = evaluateAnswer("Control Unit", rule);
  assert(!res2.isCorrect && res2.pointsAwarded === 0 && res2.matchType === "INCORRECT", "MCQ incorrect choice gives 0 points");
}

// Test 2: True/False
{
  const rule = {
    type: "TRUE_FALSE",
    points: 1,
    correctAnswers: ["False"],
  };
  const res = evaluateAnswer("False", rule);
  assert(res.isCorrect && res.pointsAwarded === 1, "True/False correct answer");
}

// Test 3: Short Answer - Normalization & Whitespace
{
  const rule = {
    type: "SHORT_ANSWER",
    points: 2,
    correctAnswers: ["Random Access Memory", "RAM"],
    isCaseSensitive: false,
    allowFuzzy: false,
  };
  const res = evaluateAnswer("   random   access   memory   ", rule);
  assert(res.isCorrect && res.pointsAwarded === 2 && res.matchType === "EXACT", "Short Answer whitespace collapse & case insensitive");
}

// Test 4: Short Answer - Synonym Array
{
  const rule = {
    type: "SHORT_ANSWER",
    points: 2,
    correctAnswers: ["Random Access Memory", "RAM", "Main Memory"],
    isCaseSensitive: false,
    allowFuzzy: false,
  };
  const res = evaluateAnswer("RAM", rule);
  assert(res.isCorrect && res.matchType === "SYNONYM", "Short Answer matches valid synonym 'RAM'");
}

// Test 5: Short Answer - Fuzzy Matching (1 Typo Allowed)
{
  const rule = {
    type: "SHORT_ANSWER",
    points: 2,
    correctAnswers: ["Random Access Memory"],
    isCaseSensitive: false,
    allowFuzzy: true,
    fuzzyThreshold: 1,
  };
  // Typo: "Random Acces Memory" (missing one 's')
  const res = evaluateAnswer("Random Acces Memory", rule);
  assert(res.isCorrect && res.matchType === "FUZZY" && res.pointsAwarded === 2, "Short Answer matches with 1 typo via Levenshtein fuzzy distance");
}

// Test 6: Short Answer - Strict Case Sensitive
{
  const rule = {
    type: "SHORT_ANSWER",
    points: 1,
    correctAnswers: ["CSS"],
    isCaseSensitive: true,
    allowFuzzy: false,
  };
  const resValid = evaluateAnswer("CSS", rule);
  assert(resValid.isCorrect && resValid.pointsAwarded === 1, "Strict case-sensitive matches exact uppercase CSS");

  const resInvalid = evaluateAnswer("css", rule);
  assert(!resInvalid.isCorrect && resInvalid.pointsAwarded === 0, "Strict case-sensitive rejects lowercase css");
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
