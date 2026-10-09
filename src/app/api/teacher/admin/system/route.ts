import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Admin-Only System Health & Telemetry API
 * Provides zero-overhead traffic monitoring, active exam load,
 * database ping latency, and error auditing.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
    select: { id: true, role: true, isApproved: true },
  });

  if (!teacher || (!isAdmin && teacher.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    // 1. Measure real-time TiDB cluster round-trip latency
    const pingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - pingStart;

    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 2. Active Concurrent Exam Test-Takers (Queried from existing submissions)
    const inProgressSubmissions = await prisma.submission.findMany({
      where: { status: "IN_PROGRESS" },
      select: {
        id: true,
        studentIdNumber: true,
        studentName: true,
        startedAt: true,
        quizId: true,
        quiz: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            timerMode: true,
            deadlineAt: true,
            subject: { select: { subjectCode: true, title: true } },
          },
        },
      },
    });

    const activeTestTakers = inProgressSubmissions.filter((s) => {
      const elapsed = Date.now() - new Date(s.startedAt).getTime();
      const maxAllowed = (s.quiz.durationMinutes * 60 + 120) * 1000;
      const deadlinePassed = s.quiz.deadlineAt && new Date(s.quiz.deadlineAt).getTime() < Date.now();
      return elapsed <= maxAllowed && !deadlinePassed;
    });

    // Breakdown active students by quiz room
    const activeRoomsMap = new Map<string, { quizId: string; title: string; subjectCode: string; count: number }>();
    for (const s of activeTestTakers) {
      const existing = activeRoomsMap.get(s.quizId);
      if (existing) {
        existing.count++;
      } else {
        activeRoomsMap.set(s.quizId, {
          quizId: s.quizId,
          title: s.quiz.title,
          subjectCode: s.quiz.subject.subjectCode,
          count: 1,
        });
      }
    }

    // 3. Submissions Volume (24h & 7d)
    const [
      submissions24hCount,
      submissions7dCount,
      violations24hCount,
      liveQuizzesCount,
      totalErrorsCount,
      serverErrors500Count,
      recentErrorLogs,
    ] = await Promise.all([
      prisma.submission.count({
        where: {
          submittedAt: { gte: oneDayAgo },
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        },
      }),
      prisma.submission.count({
        where: {
          submittedAt: { gte: sevenDaysAgo },
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        },
      }),
      prisma.violationLog.count({
        where: { timestamp: { gte: oneDayAgo } },
      }),
      prisma.quiz.count({
        where: {
          isPublished: true,
          OR: [{ deadlineAt: null }, { deadlineAt: { gt: now } }],
          AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }],
        },
      }),
      prisma.systemErrorLog.count(),
      prisma.systemErrorLog.count({
        where: { statusCode: { gte: 500 } },
      }),
      prisma.systemErrorLog.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      // Hourly submissions in last 24h
      prisma.submission.findMany({
        where: {
          submittedAt: { gte: oneDayAgo },
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        },
        select: { submittedAt: true },
      }),
      // Hourly errors in last 24h
      prisma.systemErrorLog.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { createdAt: true, statusCode: true, endpoint: true },
      }),
    ]);

    // Build 24 hourly buckets (from 23 hours ago up to current hour)
    const hourlyBuckets: {
      hourLabel: string;
      hourKey: string;
      submissions: number;
      serverErrors: number;
      clientErrors: number;
    }[] = [];

    const bucketMap = new Map<string, { submissions: number; serverErrors: number; clientErrors: number }>();

    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}`;
      const hourLabel = `${String(d.getHours()).padStart(2, "0")}:00`;
      bucketMap.set(hourKey, { submissions: 0, serverErrors: 0, clientErrors: 0 });
      hourlyBuckets.push({ hourLabel, hourKey, submissions: 0, serverErrors: 0, clientErrors: 0 });
    }

    for (const sub of recentSubmissions24h) {
      if (!sub.submittedAt) continue;
      const d = new Date(sub.submittedAt);
      const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}`;
      const bucket = bucketMap.get(hourKey);
      if (bucket) bucket.submissions++;
    }

    const endpointErrorCounts = new Map<string, { total: number; s500: number; s4xx: number }>();
    let errorsIn24hCount = 0;
    let s500In24hCount = 0;

    for (const err of recentErrors24h) {
      errorsIn24hCount++;
      const is500 = err.statusCode >= 500;
      if (is500) s500In24hCount++;

      const d = new Date(err.createdAt);
      const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}`;
      const bucket = bucketMap.get(hourKey);
      if (bucket) {
        if (is500) bucket.serverErrors++;
        else bucket.clientErrors++;
      }

      const ep = err.endpoint || "Unknown";
      const epData = endpointErrorCounts.get(ep) || { total: 0, s500: 0, s4xx: 0 };
      epData.total++;
      if (is500) epData.s500++;
      else epData.s4xx++;
      endpointErrorCounts.set(ep, epData);
    }

    for (const b of hourlyBuckets) {
      const data = bucketMap.get(b.hourKey);
      if (data) {
        b.submissions = data.submissions;
        b.serverErrors = data.serverErrors;
        b.clientErrors = data.clientErrors;
      }
    }

    // Top 5 error endpoints
    const topErrorEndpoints = Array.from(endpointErrorCounts.entries())
      .map(([endpoint, counts]) => ({
        endpoint,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({
      timestamp: now.toISOString(),
      health: {
        database: "CONNECTED",
        dbLatencyMs,
        status: dbLatencyMs < 200 ? "OPTIMAL" : dbLatencyMs < 500 ? "MODERATE" : "DEGRADED",
      },
      traffic: {
        activeConcurrentTestTakers: activeTestTakers.length,
        activeRooms: Array.from(activeRoomsMap.values()),
        submissions24h: submissions24hCount,
        submissions7d: submissions7dCount,
        violations24h: violations24hCount,
        liveQuizzes: liveQuizzesCount,
      },
      errors: {
        totalErrors: totalErrorsCount,
        serverErrors500: serverErrors500Count,
        errors24h: errorsIn24hCount,
        serverErrors24h: s500In24hCount,
        recentLogs: recentErrorLogs,
        topEndpoints: topErrorEndpoints,
      },
      timeline: {
        hourly: hourlyBuckets,
      },
    });
  } catch (error: any) {
    console.error("System telemetry API failure:", error);
    return NextResponse.json(
      { error: "Failed to gather telemetry diagnostics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Purge or clear error logs (Admin only)
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase().trim();
  const isAdmin = isSystemAdmin(email);

  const teacher = await prisma.teacher.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!teacher || (!isAdmin && teacher.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const olderThanDays = searchParams.get("olderThanDays");

    if (olderThanDays && !isNaN(Number(olderThanDays))) {
      const cutoff = new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000);
      const res = await prisma.systemErrorLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return NextResponse.json({ success: true, deletedCount: res.count });
    }

    const res = await prisma.systemErrorLog.deleteMany({});
    return NextResponse.json({ success: true, deletedCount: res.count });
  } catch (error: any) {
    console.error("Clear error logs failure:", error);
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
  }
}
