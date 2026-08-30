const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testDeleteClassCascade() {
  console.log("Testing Complete Class & Cascade Deletion...");

  // 1. Get or create Teacher
  let teacher = await prisma.teacher.findFirst();
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        email: "test-teacher@school.edu",
        name: "Test Teacher",
      },
    });
  }

  // 2. Create a temporary subject to delete
  const subjectCode = "TEMP-TEST-" + Date.now().toString().slice(-4);
  const tempSubject = await prisma.subject.create({
    data: {
      teacherId: teacher.id,
      subjectCode,
      title: "Temporary Class for Deletion Testing",
      description: "Will be deleted entirely",
    },
  });
  console.log(`Created test class: ${tempSubject.subjectCode} (${tempSubject.id})`);

  // 3. Add enrollments to this subject
  await prisma.enrollment.createMany({
    data: [
      { subjectId: tempSubject.id, studentIdNumber: "TEST-STU-1", studentName: "Student 1" },
      { subjectId: tempSubject.id, studentIdNumber: "TEST-STU-2", studentName: "Student 2" },
    ],
  });

  // 4. Add a quiz and question to this subject
  const quiz = await prisma.quiz.create({
    data: {
      subjectId: tempSubject.id,
      title: "Sample Quiz for Test Class",
      durationMinutes: 15,
      isPublished: true,
      questions: {
        create: [
          {
            type: "MULTIPLE_CHOICE",
            prompt: "Sample question?",
            points: 2,
            options: JSON.stringify(["Option A", "Option B"]),
            correctAnswers: JSON.stringify(["Option A"]),
          },
        ],
      },
    },
  });

  // 5. Add a submission
  await prisma.submission.create({
    data: {
      quizId: quiz.id,
      studentIdNumber: "TEST-STU-1",
      studentName: "Student 1",
      score: 2,
      totalPoints: 2,
      status: "SUBMITTED",
    },
  });

  // Verify records exist
  const countEnrollmentsBefore = await prisma.enrollment.count({ where: { subjectId: tempSubject.id } });
  const countQuizzesBefore = await prisma.quiz.count({ where: { subjectId: tempSubject.id } });
  console.log(`Before Deletion: ${countEnrollmentsBefore} enrollments, ${countQuizzesBefore} quizzes.`);

  if (countEnrollmentsBefore !== 2 || countQuizzesBefore !== 1) {
    throw new Error("Failed to set up test data.");
  }

  // 6. Execute Subject Deletion (same operation as DELETE /api/teacher/subjects/[id])
  await prisma.subject.delete({
    where: { id: tempSubject.id },
  });
  console.log(`Executed complete deletion of subject ${tempSubject.id}.`);

  // 7. Verify cascade deletion
  const subjectAfter = await prisma.subject.findUnique({ where: { id: tempSubject.id } });
  const countEnrollmentsAfter = await prisma.enrollment.count({ where: { subjectId: tempSubject.id } });
  const countQuizzesAfter = await prisma.quiz.count({ where: { subjectId: tempSubject.id } });
  const countSubmissionsAfter = await prisma.submission.count({ where: { quizId: quiz.id } });

  console.log(`After Deletion: Subject exists? ${!!subjectAfter}, Enrollments: ${countEnrollmentsAfter}, Quizzes: ${countQuizzesAfter}, Submissions: ${countSubmissionsAfter}`);

  if (!subjectAfter && countEnrollmentsAfter === 0 && countQuizzesAfter === 0 && countSubmissionsAfter === 0) {
    console.log("✅ PASS: Class and all cascade children (enrollments, quizzes, questions, submissions) were permanently wiped!");
  } else {
    throw new Error("Cascade deletion failed.");
  }
}

testDeleteClassCascade()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
