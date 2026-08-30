import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const STUDENT_COOKIE_NAME = "webquiz_student_session";

export interface StudentSessionData {
  studentIdNumber: string;
  studentName: string;
}

/**
 * Encodes student session data to a base64 string
 */
export function encodeStudentToken(data: StudentSessionData): string {
  const payload = JSON.stringify({
    ...data,
    iat: Date.now(),
  });
  return Buffer.from(payload).toString("base64url");
}

/**
 * Decodes student session token
 */
export function decodeStudentToken(token: string): StudentSessionData | null {
  try {
    const jsonStr = Buffer.from(token, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr);
    if (!data.studentIdNumber) return null;
    return {
      studentIdNumber: data.studentIdNumber,
      studentName: data.studentName || "Student",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current student session from cookies (for Server Components / Actions / Route Handlers)
 */
export async function getStudentSession(): Promise<StudentSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeStudentToken(token);
}

/**
 * Checks if a student is enrolled in a specific subject
 */
export async function verifyStudentSubjectEnrollment(
  studentIdNumber: string,
  subjectId: string
): Promise<boolean> {
  const cleanId = studentIdNumber.trim().toUpperCase();
  const count = await prisma.enrollment.count({
    where: {
      studentIdNumber: cleanId,
      subjectId: subjectId,
    },
  });
  return count > 0;
}

/**
 * Checks if a student is enrolled in the subject of a quiz
 */
export async function verifyStudentQuizEnrollment(
  studentIdNumber: string,
  quizId: string
): Promise<{ isEnrolled: boolean; quiz: any | null }> {
  const cleanId = studentIdNumber.trim().toUpperCase();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      subject: {
        include: {
          enrollments: {
            where: { studentIdNumber: cleanId },
          },
        },
      },
    },
  });

  if (!quiz) {
    return { isEnrolled: false, quiz: null };
  }

  const isEnrolled = quiz.subject.enrollments.length > 0;
  return { isEnrolled, quiz };
}
