import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../src/lib/env";

const prisma = new PrismaClient({ datasourceUrl: getDatabaseUrl() });

async function main() {
  const result = await prisma.session.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.info(`Revoked ${result.count} active session(s).`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to revoke legacy sessions.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
