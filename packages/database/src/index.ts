import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __nexusPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__nexusPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__nexusPrisma = prisma;
}

export * from "@prisma/client";
export default prisma;
