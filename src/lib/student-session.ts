import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const STUDENT_COOKIE_NAME = "webquiz_student_session";

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "webquiz-secure-student-session-secret-salt-2026";
const MAX_SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface StudentSessionData {
  studentIdNumber: string;
  studentName: string;
}

/**
 * Computes a secure HMAC-SHA256 signature for the given payload string.
 */
function signPayload(payloadBase64: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
}

/**
 * Encodes student session data into a cryptographically signed, tamper-proof token.
 * Format: `<base64url_payload>.<base64url_hmac_signature>`
 */
export function encodeStudentToken(data: StudentSessionData): string {
  const cleanId = data.studentIdNumber.trim().toUpperCase();
  const cleanName = data.studentName.trim();

  const payload = JSON.stringify({
    studentIdNumber: cleanId,
    studentName: cleanName,
    iat: Date.now(),
  });

  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = signPayload(payloadBase64);

  return `${payloadBase64}.${signature}`;
}

/**
 * Decodes and cryptographically verifies student session token with constant-time HMAC check.
 */
export function decodeStudentToken(token: string): StudentSessionData | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, providedSignature] = parts;
    if (!payloadBase64 || !providedSignature) return null;

    // Verify signature using timing-safe comparison to prevent timing attacks
    const expectedSignature = signPayload(payloadBase64);
    const providedBuf = Buffer.from(providedSignature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      console.warn("Security Alert: Invalid or forged student session signature rejected.");
      return null;
    }

    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr);

    if (!data.studentIdNumber || typeof data.studentIdNumber !== "string") {
      return null;
    }

    // Expiration check
    if (data.iat && Date.now() - data.iat > MAX_SESSION_AGE_MS) {
      return null;
    }

    return {
      studentIdNumber: data.studentIdNumber.trim().toUpperCase(),
      studentName: data.studentName || "Student",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the current verified student session from cookies.
 */
export async function getStudentSession(): Promise<StudentSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeStudentToken(token);
}

/**
 * Checks if a student is enrolled in a specific subject.
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
 * Checks if a student is enrolled in the subject of a quiz.
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
