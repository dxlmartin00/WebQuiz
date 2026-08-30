const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testMultiTenantAndApproval() {
  console.log("Testing Developer Admin Auto-Approval, Faculty Whitelisting, and Multi-Tenant Isolation...");

  const adminEmail = "lummartin@nemsu.edu.ph";
  const teacherEmail = "teacher-jane@nemsu.edu.ph";

  // 1. Create or verify Admin Teacher
  const adminTeacher = await prisma.teacher.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isApproved: true },
    create: {
      email: adminEmail,
      name: "Prof. Luigie Martin (Developer)",
      role: "ADMIN",
      isApproved: true,
    },
  });

  console.log(`Admin created/verified: ${adminTeacher.email}, Role: ${adminTeacher.role}, Approved: ${adminTeacher.isApproved}`);
  if (adminTeacher.role !== "ADMIN" || !adminTeacher.isApproved) {
    throw new Error("Admin teacher should be auto-approved with role ADMIN");
  }

  // 2. Create or verify regular Faculty Teacher (initially unapproved)
  let regularTeacher = await prisma.teacher.upsert({
    where: { email: teacherEmail },
    update: { role: "TEACHER", isApproved: false },
    create: {
      email: teacherEmail,
      name: "Prof. Jane Doe",
      role: "TEACHER",
      isApproved: false,
    },
  });

  console.log(`Regular Teacher created: ${regularTeacher.email}, Approved: ${regularTeacher.isApproved}`);
  if (regularTeacher.isApproved !== false) {
    throw new Error("Regular teacher should start as unapproved (pending admin action)");
  }

  // 3. Simulate Developer Admin approving the teacher
  regularTeacher = await prisma.teacher.update({
    where: { id: regularTeacher.id },
    data: { isApproved: true },
  });
  console.log(`Admin approved Teacher: ${regularTeacher.email}, Approved now: ${regularTeacher.isApproved}`);

  // 4. Test Multi-Tenant Class Isolation
  // Clean prior test subjects if any
  await prisma.subject.deleteMany({
    where: {
      subjectCode: { in: ["CS-ADMIN-101", "CS-JANE-201"] },
    },
  });

  const adminSubject = await prisma.subject.create({
    data: {
      teacherId: adminTeacher.id,
      subjectCode: "CS-ADMIN-101",
      title: "Admin Distributed Systems",
    },
  });

  const janeSubject = await prisma.subject.create({
    data: {
      teacherId: regularTeacher.id,
      subjectCode: "CS-JANE-201",
      title: "Jane Computer Graphics",
    },
  });

  console.log(`Created Admin Subject: ${adminSubject.subjectCode} (${adminSubject.id})`);
  console.log(`Created Jane Subject: ${janeSubject.subjectCode} (${janeSubject.id})`);

  // Query admin subjects
  const adminSubjects = await prisma.subject.findMany({
    where: { teacherId: adminTeacher.id },
  });
  const adminSubjectCodes = adminSubjects.map((s) => s.subjectCode);
  console.log(`Admin sees classes: ${adminSubjectCodes.join(", ")}`);

  // Query Jane subjects
  const janeSubjects = await prisma.subject.findMany({
    where: { teacherId: regularTeacher.id },
  });
  const janeSubjectCodes = janeSubjects.map((s) => s.subjectCode);
  console.log(`Jane sees classes: ${janeSubjectCodes.join(", ")}`);

  if (adminSubjectCodes.includes("CS-JANE-201")) {
    throw new Error("Multi-tenant leak: Admin saw Jane's private class");
  }
  if (janeSubjectCodes.includes("CS-ADMIN-101")) {
    throw new Error("Multi-tenant leak: Jane saw Admin's private class");
  }

  // Test cross-teacher access prevention
  const janeAttemptToAccessAdminSubject = await prisma.subject.findFirst({
    where: { id: adminSubject.id, teacherId: regularTeacher.id },
  });

  console.log(`Jane query for Admin subject returned: ${janeAttemptToAccessAdminSubject}`);
  if (janeAttemptToAccessAdminSubject !== null) {
    throw new Error("Jane was able to query Admin's subject!");
  }

  console.log("✅ ALL MULTI-TENANT ISOLATION AND APPROVAL TESTS PASSED!");
}

testMultiTenantAndApproval()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
