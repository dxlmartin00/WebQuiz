/**
 * End-to-End API Integration & Flow Test
 */

async function runE2ETests() {
  console.log("Starting End-to-End API Verification against http://localhost:3000...\n");

  // Test 1: Student Login with enrolled student STU-1002
  console.log("1. Testing Student Login API...");
  const loginRes = await fetch("http://localhost:3000/api/student/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIdNumber: "STU-1002" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Student login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  console.log("   [PASS] Student Logged In:", loginData.student);

  // Extract session cookie
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No session cookie returned from student login!");
  }
  const cookieHeader = setCookie.split(";")[0];

  // Test 2: Fetch Student Profile & Dashboard
  console.log("\n2. Testing Student Dashboard Data API (/api/student/me)...");
  const meRes = await fetch("http://localhost:3000/api/student/me", {
    headers: { Cookie: cookieHeader },
  });
  if (!meRes.ok) throw new Error(`Fetch me failed with status ${meRes.status}`);
  const meData = await meRes.json();
  console.log(`   [PASS] Found ${meData.enrolledSubjects.length} enrolled subjects, ${meData.activeQuizzes.length} active quizzes.`);

  if (meData.activeQuizzes.length === 0) {
    throw new Error("No active quizzes available for student!");
  }

  const targetQuiz = meData.activeQuizzes[0];
  console.log(`   Target Quiz: ${targetQuiz.title} (ID: ${targetQuiz.id})`);

  // Test 3: Start Quiz Attempt
  console.log("\n3. Testing Quiz Start Session (/api/student/quiz/[id]/start)...");
  const startRes = await fetch(`http://localhost:3000/api/student/quiz/${targetQuiz.id}/start`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  if (!startRes.ok) throw new Error(`Quiz start failed: ${await startRes.text()}`);
  const startData = await startRes.json();
  console.log(`   [PASS] Started quiz session. Server remaining seconds: ${startData.remainingSeconds}s, Questions: ${startData.questions.length}`);

  // Test 4: Record Anti-Cheating Violation (Tab switch)
  console.log("\n4. Testing Anti-Cheating Violation Logging (/api/student/quiz/[id]/violation)...");
  const violRes = await fetch(`http://localhost:3000/api/student/quiz/${targetQuiz.id}/violation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      eventType: "TAB_SWITCH",
      details: "Student unfocused browser tab during verification test",
    }),
  });
  if (!violRes.ok) throw new Error(`Violation log failed: ${await violRes.text()}`);
  const violData = await violRes.json();
  console.log(`   [PASS] Infraction recorded. Strike count: ${violData.violationCount}/${violData.maxViolations}`);

  // Test 5: Submit Answers with various answer formats (Exact, Synonym, Fuzzy, and Wrong)
  console.log("\n5. Testing Server-Authoritative Submission & Automated Grading...");
  const questions = startData.questions;
  const studentAnswers = {};

  for (const q of questions) {
    if (q.type === "MULTIPLE_CHOICE") {
      studentAnswers[q.id] = q.options[0]; // First option
    } else if (q.type === "TRUE_FALSE") {
      studentAnswers[q.id] = "False";
    } else if (q.type === "SHORT_ANSWER") {
      if (q.prompt.includes("RAM")) {
        studentAnswers[q.id] = "random access memory"; // Normalized match
      } else if (q.prompt.includes("LIFO")) {
        studentAnswers[q.id] = "Stak"; // Fuzzy typo tolerance test (Levenshtein distance 1)
      } else if (q.isCaseSensitive) {
        studentAnswers[q.id] = "CSS"; // Strict uppercase match
      } else {
        studentAnswers[q.id] = "Valid Answer";
      }
    }
  }

  const submitRes = await fetch(`http://localhost:3000/api/student/quiz/${targetQuiz.id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      answers: studentAnswers,
      isAutoSubmit: false,
    }),
  });

  if (!submitRes.ok) throw new Error(`Quiz submit failed: ${await submitRes.text()}`);
  const submitData = await submitRes.json();
  console.log(`   [PASS] Quiz Graded! Total Score: ${submitData.score}/${submitData.totalPoints} (${submitData.percentage.toFixed(1)}%), Status: ${submitData.status}`);
  console.log(`   Breakdown per question:`);
  for (const item of submitData.breakdown) {
    console.log(`     - Q: "${item.prompt.slice(0, 30)}..." -> Answer: "${item.studentAnswer}" | Correct: ${item.isCorrect} | Awarded: ${item.pointsAwarded}pts | MatchType: ${item.matchType}`);
  }

  console.log("\nALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀");
}

runE2ETests().catch((e) => {
  console.error("\nE2E Test Failed:", e);
  process.exit(1);
});
