import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Automatically configure robust connection pooling for high-concurrency multi-student exams
const rawDbUrl = process.env.DATABASE_URL || "";
let poolUrl = rawDbUrl;
if (poolUrl && !poolUrl.includes("connection_limit")) {
  const delimiter = poolUrl.includes("?") ? "&" : "?";
  poolUrl = `${poolUrl}${delimiter}connection_limit=20&pool_timeout=30`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: poolUrl
      ? {
          db: {
            url: poolUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always cache client instance on globalThis to prevent redundant pools across serverless lambdas
globalForPrisma.prisma = prisma;
