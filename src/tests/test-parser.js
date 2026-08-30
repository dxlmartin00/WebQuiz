const XLSX = require("xlsx");

// Mocking matrix parser logic for test execution
function testParseMatrix() {
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
    ["1006261", "AGUDO, FRAGILE JOHN C.", "Male", "Bachelor o", "299090", "09276704523", "", "No COR printed"],
    ["1002355", "AYADE, JAZZTINE A.", "Male", "Bachelor o", "298399", "09106891269", "", "No COR printed"],
    ["1003982", "BUSCAGAN, JORELYN MAE Y.", "Female", "Bachelor o", "278241", "09489946619", "", "No COR printed"],
    ["1003342", "CONJURADO, NELWIN O.", "Male", "Bachelor o", "293874", "09709019322", "", "No COR printed"],
    ["1004063", "CURATO, JHONCARLO C.", "Male", "Bachelor o", "285830", "09030962284", "", "No COR printed"],
    ["1005721", "CUSTAN, PATRICK JAY A.", "Male", "Bachelor o", "284441", "09639090638", "", "No COR printed"],
    ["1002998", "DAGASDAS, JOMAR B.", "Male", "Bachelor o", "281727", "09705843360", "", "No COR printed"],
    ["1004072", "DEQUIT, AXCEL JAY E.", "Male", "Bachelor o", "288764", "09109738155", "", "No COR printed"],
    ["1005081", "EMBUSCADO, ERICA JENE N.", "Female", "Bachelor o", "302907", "09705843447", "", "No COR printed"],
    ["1003966", "GALVEZ, MARIA LINDSAY D.", "Female", "Bachelor o", "278254", "09636026906", "", "No COR printed"],
    ["1004199", "GOMELOS, JENELYN O.", "Female", "Bachelor o", "302970", "09630208005", "", "No COR printed"],
    ["1002906", "GONZALES, MAURINE CHRISTAL", "Male", "Bachelor o", "278783", "09505560233", "", "No COR printed"],
    ["1008717", "HANDUGAN, MARK ANTHONY P", "Male", "Bachelor o", "297509", "09480536341", "", "No COR printed"],
    ["1004299", "LIBRAZON, JOHN CARL ..", "Female", "Bachelor o", "289463", "09647691043", "", "Officially enrolled"],
    ["1005475", "LUAYON, APRIL KARYLLE KRIS -.", "Female", "Bachelor o", "294372", "09518130530", "", "No COR printed"],
    ["1004499", "MAHUSAY, REMUEL M.", "Male", "Bachelor o", "279257", "09356807685", "", "No COR printed"],
    ["1002874", "MARTINEZ, ERJUDE J.", "Male", "Bachelor o", "288733", "09638294227", "", "No COR printed"],
    ["1001903", "MONTILLA, JAYLOU MARIE R.", "Female", "Bachelor o", "278788", "09486958608", "", "Officially enrolled"],
    ["1002863", "NIEGAS, KRISHA MAY A.", "Female", "Bachelor o", "289501", "09459948159", "", "No COR printed"],
  ];

  console.log("Testing Excel Class List Matrix Parser on NEMSU format...");

  // Write to temporary workbook to test XLSX file parsing as well
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleSpreadsheetData);
  XLSX.utils.book_append_sheet(wb, ws, "ClassList");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const readWb = XLSX.read(buffer, { type: "buffer" });
  const readWs = readWb.Sheets[readWb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(readWs, { header: 1, defval: "", raw: false });

  // Test extraction
  let idCol = -1, nameCol = -1, headerRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || "").trim().toLowerCase();
      if (cell === "idnumber" || cell === "id number" || cell === "student id") idCol = c;
      if (cell === "fullname" || cell === "full name" || cell === "name") nameCol = c;
    }
    if (idCol !== -1 && nameCol !== -1) {
      headerRow = r;
      break;
    }
  }

  console.log(`Found header at row ${headerRow}, Id Col: ${idCol}, Name Col: ${nameCol}`);

  const extracted = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const id = String(row[idCol] || "").trim();
    const name = String(row[nameCol] || "").trim();
    if (id && name) {
      extracted.push({ studentIdNumber: id, studentName: name });
    }
  }

  console.log(`Extracted ${extracted.length} students:`);
  console.log("First 3:", extracted.slice(0, 3));
  console.log("Last 2:", extracted.slice(-2));

  if (extracted.length === 19 && extracted[0].studentIdNumber === "1006261" && extracted[0].studentName === "AGUDO, FRAGILE JOHN C.") {
    console.log("✅ PARSER UNIT TEST PASSED!");
  } else {
    throw new Error(`Unexpected result count: ${extracted.length}`);
  }
}

testParseMatrix();
