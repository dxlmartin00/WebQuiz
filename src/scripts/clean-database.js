const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("Starting Clean Database Reset...");

  const adminEmail = (process.env.ADMIN_EMAIL || "lummartin@nemsu.edu.ph").toLowerCase().trim();

  // 1. Ensure Developer Admin record is preserved/created
  const adminTeacher = await prisma.teacher.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      isApproved: true,
    },
    create: {
      email: adminEmail,
      name: "Prof. Luigie Martin",
      role: "ADMIN",
      isApproved: true,
    },
  });

  console.log(`Preserving Developer Admin Account: ${adminTeacher.email} (ID: ${adminTeacher.id})`);

  // 2. Cascade delete all submissions, answers, and violation logs
  const deletedViolationLogs = await prisma.violationLog.deleteMany({});
  console.log(`Deleted Violation Logs: ${deletedViolationLogs.count}`);

  const deletedAnswers = await prisma.submissionAnswer.deleteMany({});
  console.log(`Deleted Submission Answers: ${deletedAnswers.count}`);

  const deletedSubmissions = await prisma.submission.deleteMany({});
  console.log(`Deleted Submissions: ${deletedSubmissions.count}`);

  // 3. Delete all questions and quizzes
  const deletedQuestions = await prisma.question.deleteMany({});
  console.log(`Deleted Questions: ${deletedQuestions.count}`);

  const deletedQuizzes = await prisma.quiz.deleteMany({});
  console.log(`Deleted Quizzes: ${deletedQuizzes.count}`);

  // 4. Delete all enrollments and subjects
  const deletedEnrollments = await prisma.enrollment.deleteMany({});
  console.log(`Deleted Enrollments: ${deletedEnrollments.count}`);

  const deletedSubjects = await prisma.subject.deleteMany({});
  console.log(`Deleted Subjects: ${deletedSubjects.count}`);

  // 5. Delete all test/non-admin teachers
  const deletedTeachers = await prisma.teacher.deleteMany({
    where: {
      id: { not: adminTeacher.id },
    },
  });
  console.log(`Deleted Non-Admin Teachers: ${deletedTeachers.count}`);

  // Verification summary
  const teacherCount = await prisma.teacher.count();
  const subjectCount = await prisma.subject.count();
  const enrollmentCount = await prisma.enrollment.count();
  const quizCount = await prisma.quiz.count();
  const submissionCount = await prisma.submission.count();

  console.log("\n--- Clean Database Status ---");
  console.log(`Teachers: ${teacherCount} (Admin: ${adminTeacher.email})`);
  console.log(`Subjects/Classes: ${subjectCount}`);
  console.log(`Enrollments: ${enrollmentCount}`);
  console.log(`Quizzes: ${quizCount}`);
  console.log(`Submissions: ${submissionCount}`);
  console.log("-----------------------------\n");
  console.log("✅ Database successfully reset and pristine for production use!");
}

resetDatabase()
  .catch((e) => {
    console.error("Database reset failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
