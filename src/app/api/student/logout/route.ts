import { NextResponse } from "next/server";
import { STUDENT_COOKIE_NAME, getStudentSession, terminateStudentSession } from "@/lib/student-session";

export async function POST() {
  try {
    const session = await getStudentSession();
    if (session?.studentIdNumber) {
      await terminateStudentSession(session.studentIdNumber);
    }
  } catch (err) {
    console.error("Student logout error:", err);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(STUDENT_COOKIE_NAME);
  return response;
}
