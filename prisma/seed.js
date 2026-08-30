const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding WebQuiz database...");

  // Clean old records
  await prisma.violationLog.deleteMany({});
  await prisma.submissionAnswer.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.teacher.deleteMany({});

  // 1. Create Teacher
  const teacher = await prisma.teacher.create({
    data: {
      email: "teacher@school.edu",
      name: "Prof. Alan Turing",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  console.log(`Created Teacher: ${teacher.name} (${teacher.email})`);

  // 2. Create Subjects
  const cs101 = await prisma.subject.create({
    data: {
      teacherId: teacher.id,
      subjectCode: "CS101",
      title: "Introduction to Computer Science & Systems",
      description: "Foundational computer architecture, data structures, and networking fundamentals.",
    },
  });

  const cs204 = await prisma.subject.create({
    data: {
      teacherId: teacher.id,
      subjectCode: "CS204",
      title: "Web Architecture & Security",
      description: "Modern client-server protocols, security mechanics, and full-stack engineering.",
    },
  });

  console.log("Created Subjects: CS101 and CS204");

  // 3. Create Student Enrollments
  const students = [
    { studentIdNumber: "STU-1001", studentName: "Alice Johnson" },
    { studentIdNumber: "STU-1002", studentName: "Bob Smith" },
    { studentIdNumber: "STU-1003", studentName: "Charlie Davis" },
    { studentIdNumber: "STU-1004", studentName: "Diana Prince" },
    { studentIdNumber: "STU-1005", studentName: "Evan Wright" },
  ];

  for (const s of students) {
    await prisma.enrollment.create({
      data: {
        subjectId: cs101.id,
        studentIdNumber: s.studentIdNumber,
        studentName: s.studentName,
      },
    });

    await prisma.enrollment.create({
      data: {
        subjectId: cs204.id,
        studentIdNumber: s.studentIdNumber,
        studentName: s.studentName,
      },
    });
  }

  console.log(`Enrolled ${students.length} students across subjects.`);

  // 4. Create CS101 Comprehensive Exam
  const quiz1 = await prisma.quiz.create({
    data: {
      subjectId: cs101.id,
      title: "CS101 Comprehensive Exam: Architecture & Systems",
      description: "Evaluate core concepts on CPU design, protocols, memory hierarchy, and data structures. Anti-cheating monitoring active.",
      durationMinutes: 20,
      maxViolations: 3,
      isPublished: true,
      shuffleQuestions: false,
      shuffleChoices: true,
      deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const questions1 = [
    {
      type: "MULTIPLE_CHOICE",
      prompt: "Which component inside a Central Processing Unit (CPU) directly executes arithmetic and boolean operations?",
      points: 2,
      options: JSON.stringify(["ALU (Arithmetic Logic Unit)", "Control Unit", "Program Counter", "Memory Bus"]),
      correctAnswers: JSON.stringify(["ALU (Arithmetic Logic Unit)"]),
      orderIndex: 0,
    },
    {
      type: "TRUE_FALSE",
      prompt: "HTTP/1.1 is considered a stateful protocol by default because it maintains persistent TCP connections.",
      points: 1,
      options: JSON.stringify(["True", "False"]),
      correctAnswers: JSON.stringify(["False"]),
      orderIndex: 1,
    },
    {
      type: "SHORT_ANSWER",
      prompt: "What does the abbreviation 'RAM' stand for in computer hardware?",
      points: 2,
      options: JSON.stringify([]),
      correctAnswers: JSON.stringify(["Random Access Memory", "Random-Access Memory", "RAM", "Random access memory"]),
      allowFuzzy: true,
      fuzzyThreshold: 1,
      isCaseSensitive: false,
      orderIndex: 2,
    },
    {
      type: "SHORT_ANSWER",
      prompt: "Which fundamental data structure operates strictly on the Last-In, First-Out (LIFO) order?",
      points: 2,
      options: JSON.stringify([]),
      correctAnswers: JSON.stringify(["Stack", "stack", "A Stack", "Stack Data Structure"]),
      allowFuzzy: true,
      fuzzyThreshold: 1,
      isCaseSensitive: false,
      orderIndex: 3,
    },
    {
      type: "MULTIPLE_CHOICE",
      prompt: "What is the primary role of the Domain Name System (DNS) on the Internet?",
      points: 2,
      options: JSON.stringify([
        "Translating human-readable domain names into IP addresses",
        "Encrypting application layer payloads with TLS",
        "Managing BGP routing tables between Autonomous Systems",
        "Storing session cookies in the browser cache"
      ]),
      correctAnswers: JSON.stringify(["Translating human-readable domain names into IP addresses"]),
      orderIndex: 4,
    },
    {
      type: "SHORT_ANSWER",
      prompt: "Provide the exact uppercase 3-letter acronym for the style sheet language used for describing presentation in web documents:",
      points: 1,
      options: JSON.stringify([]),
      correctAnswers: JSON.stringify(["CSS"]),
      isCaseSensitive: true,
      allowFuzzy: false,
      orderIndex: 5,
    },
  ];

  for (const q of questions1) {
    await prisma.question.create({
      data: {
        quizId: quiz1.id,
        ...q,
      },
    });
  }

  // 5. Create CS204 Quiz
  const quiz2 = await prisma.quiz.create({
    data: {
      subjectId: cs204.id,
      title: "CS204 Security & Auth Assessment",
      description: "Quick 10-minute checkpoint on modern authentication tokens, CORS, and SQL injection prevention.",
      durationMinutes: 10,
      maxViolations: 2,
      isPublished: true,
      shuffleQuestions: false,
      shuffleChoices: false,
      deadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const questions2 = [
    {
      type: "MULTIPLE_CHOICE",
      prompt: "Which token type is digitally signed using cryptographic standards (e.g. HMAC or RSA) to represent claims securely?",
      points: 2,
      options: JSON.stringify(["JWT (JSON Web Token)", "Session Cookie", "Basic Auth Header", "API Key Header"]),
      correctAnswers: JSON.stringify(["JWT (JSON Web Token)"]),
      orderIndex: 0,
    },
    {
      type: "TRUE_FALSE",
      prompt: "Parameterized queries with prepared statements are an effective primary defense against SQL Injection attacks.",
      points: 2,
      options: JSON.stringify(["True", "False"]),
      correctAnswers: JSON.stringify(["True"]),
      orderIndex: 1,
    },
    {
      type: "SHORT_ANSWER",
      prompt: "What does the 'S' stand for in HTTPS?",
      points: 1,
      options: JSON.stringify([]),
      correctAnswers: JSON.stringify(["Secure", "secure", "Security"]),
      allowFuzzy: true,
      fuzzyThreshold: 1,
      orderIndex: 2,
    },
  ];

  for (const q of questions2) {
    await prisma.question.create({
      data: {
        quizId: quiz2.id,
        ...q,
      },
    });
  }

  // 6. Create sample completed submission for Alice Johnson to showcase Gradebook & Analytics
  const submission = await prisma.submission.create({
    data: {
      quizId: quiz1.id,
      studentIdNumber: "STU-1001",
      studentName: "Alice Johnson",
      score: 9,
      totalPoints: 10,
      startedAt: new Date(Date.now() - 25 * 60 * 1000),
      submittedAt: new Date(Date.now() - 10 * 60 * 1000),
      violationCount: 1,
      status: "SUBMITTED",
    },
  });

  await prisma.violationLog.create({
    data: {
      submissionId: submission.id,
      eventType: "WINDOW_BLUR",
      details: "Student unfocused the quiz tab for 3.2 seconds",
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
    },
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
