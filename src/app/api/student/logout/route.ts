import { NextResponse } from "next/server";
import { STUDENT_COOKIE_NAME } from "@/lib/student-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(STUDENT_COOKIE_NAME);
  return response;
}
