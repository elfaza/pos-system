import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./env";

getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/** Create a dedicated client for scripts, migrations, and provisioning jobs. */
export function createMaintenancePrismaClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: process.env.MIGRATION_DATABASE_URL ?? getDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
