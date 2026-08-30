import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Perform a lightweight query to generate active traffic and prevent Supabase from pausing
    const teacherCount = await prisma.teacher.count();
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      success: true,
      service: "WebQuiz Supabase Keep-Alive Anti-Idling Heartbeat",
      timestamp,
      teacherCount,
      message: "Database pinged successfully. Supabase will not pause.",
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
