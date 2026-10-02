import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Perform a lightweight query to keep DB alive and clean up expired student sessions
    const [teacherCount, cleanedSessions] = await Promise.all([
      prisma.teacher.count(),
      prisma.studentSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      success: true,
      service: "WebQuiz Database Keep-Alive & Session Purge",
      timestamp,
      teacherCount,
      expiredSessionsPurged: cleanedSessions.count,
      message: "Database pinged and expired sessions cleaned successfully.",
    });
  } catch (error: any) {
    console.error("Keep-Alive Cron Ping Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to ping database",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
