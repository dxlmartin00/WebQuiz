import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encodeStudentToken, STUDENT_COOKIE_NAME } from "@/lib/student-session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studentIdNumber = body.studentIdNumber?.trim().toUpperCase();

    if (!studentIdNumber) {
      return NextResponse.json(
        { error: "Student ID Number is required" },
        { status: 400 }
      );
    }

    // Find if the student is registered in ANY active subject roster
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentIdNumber,
      },
      include: {
        subject: true,
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json(
        {
          error: `Student ID '${studentIdNumber}' was not found in any enrolled class roster. Please contact your instructor.`,
        },
        { status: 404 }
      );
    }

    const studentName = enrollments[0].studentName;
    const token = encodeStudentToken({
      studentIdNumber,
      studentName,
    });

    const response = NextResponse.json({
      success: true,
      student: {
        studentIdNumber,
        studentName,
        enrolledSubjectsCount: enrollments.length,
      },
    });

    // Set secure HTTP cookie
    response.cookies.set(STUDENT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An error occurred during student login" },
      { status: 500 }
    );
  }
}
