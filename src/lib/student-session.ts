import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const STUDENT_COOKIE_NAME = "webquiz_student_session";

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || "webquiz-secure-student-session-secret-salt-2026";
const MAX_SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const STUDENT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of idle inactivity terminates session

export interface StudentSessionData {
  studentIdNumber: string;
  studentName: string;
  sessionToken?: string;
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
    sessionToken: data.sessionToken || "",
    iat: Date.now(),
  });

  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = signPayload(payloadBase64);

  return `${payloadBase64}.${signature}`;
}

/**
 * Decodes and cryptographically verifies student session token with constant-time HMAC check.
 */
export function decodeStudentToken(token: string): (StudentSessionData & { iat?: number }) | null {
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

    // Expiration check (Hard ceiling 7 days)
    if (data.iat && Date.now() - data.iat > MAX_SESSION_AGE_MS) {
      return null;
    }

    return {
      studentIdNumber: data.studentIdNumber.trim().toUpperCase(),
      studentName: data.studentName || "Student",
      sessionToken: data.sessionToken || undefined,
      iat: data.iat,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current verified student session from cookies and validates against the database.
 * Enforces:
 * 1. Single Active Session: Only one device/browser session can be active per student ID at a time.
 * 2. Idle Timeout: Terminates session if the student has been idle for more than STUDENT_IDLE_TIMEOUT_MS (30 mins).
 */
export async function getStudentSession(): Promise<StudentSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = decodeStudentToken(token);
  if (!decoded) return null;

  const cleanId = decoded.studentIdNumber.trim().toUpperCase();

  try {
    const activeSession = await prisma.studentSession.findUnique({
      where: { studentIdNumber: cleanId },
    });

    if (!activeSession) {
      // Session does not exist in DB (e.g. logged out, replaced, or expired)
      return null;
    }

    // 1. DUPLICATION CHECK: Enforce single active session
    // If the token in the cookie does not match the active sessionToken in DB,
    // another login occurred on a different device/browser. Invalidate this duplicate session.
    if (decoded.sessionToken && activeSession.sessionToken !== decoded.sessionToken) {
      console.warn(`[StudentSession] Concurrent duplicate session rejected for student ${cleanId}`);
      return null;
    }

    // 2. IDLE INACTIVITY TIMEOUT CHECK:
    const now = Date.now();
    const isExpired =
      activeSession.expiresAt.getTime() < now ||
      now - activeSession.lastActiveAt.getTime() > STUDENT_IDLE_TIMEOUT_MS;

    if (isExpired) {
      console.log(`[StudentSession] Session expired due to inactivity for student ${cleanId}`);
      await prisma.studentSession
        .delete({
          where: { studentIdNumber: cleanId },
        })
        .catch(() => {});
      return null;
    }

    // 3. SLIDING WINDOW ACTIVITY UPDATE:
    // Update lastActiveAt and extend expiresAt (throttled to at most once every 60s to minimize database overhead)
    if (now - activeSession.lastActiveAt.getTime() > 60 * 1000) {
      await prisma.studentSession
        .update({
          where: { studentIdNumber: cleanId },
          data: {
            lastActiveAt: new Date(now),
            expiresAt: new Date(now + STUDENT_IDLE_TIMEOUT_MS),
          },
        })
        .catch(() => {});
    }

    return {
      studentIdNumber: cleanId,
      studentName: decoded.studentName,
      sessionToken: activeSession.sessionToken,
    };
  } catch (err) {
    console.error("Error verifying student session in database:", err);
    // Graceful fallback to verified HMAC token if database is briefly unavailable
    if (decoded.iat && Date.now() - decoded.iat < STUDENT_IDLE_TIMEOUT_MS) {
      return {
        studentIdNumber: cleanId,
        studentName: decoded.studentName,
        sessionToken: decoded.sessionToken,
      };
    }
    return null;
  }
}

/**
 * Explicitly terminates the active student session in the database.
 */
export async function terminateStudentSession(studentIdNumber: string): Promise<void> {
  const cleanId = studentIdNumber.trim().toUpperCase();
  await prisma.studentSession
    .deleteMany({
      where: { studentIdNumber: cleanId },
    })
    .catch(() => {});
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
