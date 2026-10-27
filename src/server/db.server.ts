import { PrismaClient } from "@prisma/client";

// Uma única instância do Prisma Client por processo (evita estourar conexões
// em hot-reload no desenvolvimento).
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
