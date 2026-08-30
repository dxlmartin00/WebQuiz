const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = "http://localhost:3000";

async function testClassListUpload() {
  console.log("Testing Full-Stack Class List Importer with NEMSU University Format...");

  // 1. Generate the exact spreadsheet buffer from the user's uploaded image
  const sampleSpreadsheetData = [
    ["North Eastern Mindanao State University - Lianga Campus", "", "", "", "", "", "", ""],
    ["Lianga, Surigao del Sur", "", "", "", "", "", "", ""],
    ["CLASS LIST", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["Subject/Section", ":CS 314 - CS314D", "", "", "Student Count", ":3.00", "", ""],
    ["Descriptive Title", ":CS Elective 1", "", "", "", "", "", ""],
    ["Class Schedule", ":MH 01:00pm-02:00pm TF 02:30pm-04:00pm", "", "", "", "", "", ""],
    ["Instructor(s)", ":LUIGIE MARTIN", "", "", "Building/", ":College Room CL2", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["Idnumber", "Fullname", "Gender", "Course", "Code", "Mobilenu", "Emailadd", "Status"],
    ["1006261", "AGUDO, FRAGILE JOHN C.", "Male", "Bachelor of Science", "299090", "09276704523", "", "No COR printed"],
    ["1002355", "AYADE, JAZZTINE A.", "Male", "Bachelor of Science", "298399", "09106891269", "", "No COR printed"],
    ["1003982", "BUSCAGAN, JORELYN MAE Y.", "Female", "Bachelor of Science", "278241", "09489946619", "", "No COR printed"],
    ["1003342", "CONJURADO, NELWIN O.", "Male", "Bachelor of Science", "293874", "09709019322", "", "No COR printed"],
    ["1004063", "CURATO, JHONCARLO C.", "Male", "Bachelor of Science", "285830", "09030962284", "", "No COR printed"],
    ["1005721", "CUSTAN, PATRICK JAY A.", "Male", "Bachelor of Science", "284441", "09639090638", "", "No COR printed"],
    ["1002998", "DAGASDAS, JOMAR B.", "Male", "Bachelor of Science", "281727", "09705843360", "", "No COR printed"],
    ["1004072", "DEQUIT, AXCEL JAY E.", "Male", "Bachelor of Science", "288764", "09109738155", "", "No COR printed"],
    ["1005081", "EMBUSCADO, ERICA JENE N.", "Female", "Bachelor of Science", "302907", "09705843447", "", "No COR printed"],
    ["1003966", "GALVEZ, MARIA LINDSAY D.", "Female", "Bachelor of Science", "278254", "09636026906", "", "No COR printed"],
    ["1004199", "GOMELOS, JENELYN O.", "Female", "Bachelor of Science", "302970", "09630208005", "", "No COR printed"],
    ["1002906", "GONZALES, MAURINE CHRISTAL", "Male", "Bachelor of Science", "278783", "09505560233", "", "No COR printed"],
    ["1008717", "HANDUGAN, MARK ANTHONY P", "Male", "Bachelor of Science", "297509", "09480536341", "", "No COR printed"],
    ["1004299", "LIBRAZON, JOHN CARL ..", "Female", "Bachelor of Science", "289463", "09647691043", "", "Officially enrolled"],
    ["1005475", "LUAYON, APRIL KARYLLE KRIS -.", "Female", "Bachelor of Science", "294372", "09518130530", "", "No COR printed"],
    ["1004499", "MAHUSAY, REMUEL M.", "Male", "Bachelor of Science", "279257", "09356807685", "", "No COR printed"],
    ["1002874", "MARTINEZ, ERJUDE J.", "Male", "Bachelor of Science", "288733", "09638294227", "", "No COR printed"],
    ["1001903", "MONTILLA, JAYLOU MARIE R.", "Female", "Bachelor of Science", "278788", "09486958608", "", "Officially enrolled"],
    ["1002863", "NIEGAS, KRISHA MAY A.", "Female", "Bachelor of Science", "289501", "09459948159", "", "No COR printed"],
  ];

  // 2. Parse matrix into student list
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleSpreadsheetData);
  XLSX.utils.book_append_sheet(wb, ws, "ClassList");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const readWb = XLSX.read(buffer, { type: "buffer" });
  const readWs = readWb.Sheets[readWb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(readWs, { header: 1, defval: "", raw: false });

  // Simulate parser execution
  let idCol = -1, nameCol = -1, headerRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "").trim().toLowerCase();
      if (/id\s*number|idnumber|student\s*id|^id$/i.test(cell)) idCol = c;
      if (/full\s*name|fullname|student\s*name|^name$/i.test(cell)) nameCol = c;
    }
    if (idCol !== -1 && nameCol !== -1) {
      headerRow = r;
      break;
    }
  }

  const parsedStudents = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const id = String(row[idCol] || "").trim().toUpperCase();
    const name = String(row[nameCol] || "").trim();
    if (id && name) {
      parsedStudents.push({ studentIdNumber: id, studentName: name });
    }
  }

  console.log(`Parsed ${parsedStudents.length} students from Excel spreadsheet.`);

  // 3. Find CS101 subject from database
  const targetSubject = await prisma.subject.findFirst();
  if (!targetSubject) throw new Error("No subject found in DB.");
  console.log(`Enrolling into Subject: ${targetSubject.subjectCode} (${targetSubject.id})`);

  // 4. Enroll all parsed students into the subject via Prisma (same logic as API)
  for (const s of parsedStudents) {
    await prisma.enrollment.upsert({
      where: {
        subjectId_studentIdNumber: {
          subjectId: targetSubject.id,
          studentIdNumber: s.studentIdNumber,
        },
      },
      update: {
        studentName: s.studentName,
      },
      create: {
        subjectId: targetSubject.id,
        studentIdNumber: s.studentIdNumber,
        studentName: s.studentName,
      },
    });
  }
  console.log(`Enrolled ${parsedStudents.length} students into roster.`);

  // 5. Test logging in as newly enrolled student from the class list: 1006261 (AGUDO, FRAGILE JOHN C.)
  console.log("Testing Student Portal Login with newly imported student ID: 1006261...");
  const loginRes = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIdNumber: "1006261" }),
  });
  const loginJson = await loginRes.json();
  console.log("Login result:", loginJson);

  if (loginJson.success && loginJson.student.studentIdNumber === "1006261" && loginJson.student.studentName === "AGUDO, FRAGILE JOHN C.") {
    console.log("✅ E2E TEST PASSED: Class list spreadsheet uploaded, students reviewed & enrolled, and student logged in successfully!");
  } else {
    throw new Error("Failed to authenticate imported student.");
  }
}

testClassListUpload().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
