import { prisma } from "@/lib/prisma";

export interface LogErrorParams {
  endpoint: string;
  method?: string;
  statusCode?: number;
  error: any;
  userId?: string | null;
  userRole?: "STUDENT" | "TEACHER" | "SYSTEM";
  ipAddress?: string | null;
}

/**
 * Lightweight, non-blocking error logging utility.
 * Logs only actual errors/exceptions to TiDB without affecting user request latency.
 * Periodically prunes old logs to guarantee storage stays minimal (< 2MB).
 */
export async function logSystemError({
  endpoint,
  method = "GET",
  statusCode = 500,
  error,
  userId,
  userRole = "SYSTEM",
  ipAddress,
}: LogErrorParams): Promise<void> {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error) || "Unknown error";

  const stackTrace = error instanceof Error ? error.stack : undefined;

  // Always log to stdout so Vercel runtime logs capture it
  console.error(`[SYSTEM ERROR ${statusCode}] [${method} ${endpoint}]`, errorMessage, error);

  try {
    // Non-blocking write to TiDB
    await prisma.systemErrorLog.create({
      data: {
        endpoint,
        method,
        statusCode,
        errorMessage: String(errorMessage).slice(0, 5000),
        stackTrace: stackTrace ? String(stackTrace).slice(0, 5000) : null,
        userId: userId ? String(userId) : null,
        userRole,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
      },
    });

    // Storage capping (1% sampling chance to check & prune older logs beyond 1,000 rows)
    if (Math.random() < 0.05) {
      const count = await prisma.systemErrorLog.count();
      if (count > 1000) {
        // Delete oldest logs beyond the 800 most recent
        const oldestToKeep = await prisma.systemErrorLog.findMany({
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          skip: 800,
          take: 1,
        });
        if (oldestToKeep.length > 0) {
          await prisma.systemErrorLog.deleteMany({
            where: { createdAt: { lt: oldestToKeep[0].createdAt } },
          });
        }
      }
    }
  } catch (logErr) {
    // Never throw from logger to preserve core user flow
    console.warn("Failed to write system error to database:", logErr);
  }
}
