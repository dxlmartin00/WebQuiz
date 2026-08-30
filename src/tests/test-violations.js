const BASE_URL = "http://localhost:3000";

async function testViolationCooldown() {
  console.log("Testing Strike Deduplication & Cooldown Defense...");

  // 1. Log in student
  const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIdNumber: "STU-1004" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  const headers = { "Content-Type": "application/json", Cookie: cookie || "" };

  // 2. Fetch dashboard
  const meRes = await fetch(`${BASE_URL}/api/student/me`, { headers });
  const meJson = await meRes.json();
  const quiz = meJson.activeQuizzes[0];
  console.log(`Target Quiz: ${quiz.title} (ID: ${quiz.id})`);

  // 3. Start quiz session
  const startRes = await fetch(`${BASE_URL}/api/student/quiz/${quiz.id}/start`, {
    method: "POST",
    headers,
  });
  const startJson = await startRes.json();
  const initialViolations = startJson.submission?.violationCount || 0;
  console.log(`Initial violation count before events: ${initialViolations}`);

  // 4. Send 5 rapid simultaneous blur & tab-switch events
  console.log("Simulating 5 rapid simultaneous blur & tab-switch events within milliseconds...");
  const promises = [1, 2, 3, 4, 5].map((i) =>
    fetch(`${BASE_URL}/api/student/quiz/${quiz.id}/violation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventType: i % 2 === 0 ? "TAB_SWITCH" : "WINDOW_BLUR",
        details: `Simultaneous Event #${i}`,
      }),
    }).then((r) => r.json())
  );

  const results = await Promise.all(promises);
  console.log("Rapid responses received:", results.map((r) => ({ violationCount: r.violationCount, cooldown: r.cooldown })));

  const maxViolationAfter = Math.max(...results.map((r) => r.violationCount));
  const delta = maxViolationAfter - initialViolations;
  console.log(`Initial: ${initialViolations}, After 5 rapid events: ${maxViolationAfter} (Delta: +${delta})`);

  if (delta === 1) {
    console.log("✅ PASS: 5 rapid simultaneous events strictly resulted in exactly +1 strike!");
  } else {
    throw new Error(`❌ FAIL: Expected delta of +1 strike, but got +${delta}`);
  }
}

testViolationCooldown().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
