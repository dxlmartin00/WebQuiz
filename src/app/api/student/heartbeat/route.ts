import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStudentSession();

  if (!session) {
    return NextResponse.json(
      { valid: false, error: "Session expired or active on another device." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    studentIdNumber: session.studentIdNumber,
    studentName: session.studentName,
  });
}
