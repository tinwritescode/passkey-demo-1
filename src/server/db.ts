import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
