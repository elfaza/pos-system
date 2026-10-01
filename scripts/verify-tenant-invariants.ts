import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  parseTenantInvariantSnapshot,
  verifyTenantMigrationInvariants,
} from "../src/lib/tenant-migration-invariants";

function readRequiredOption(name: string): string {
  const inline = process.argv.find((argument) =>
    argument.startsWith(`--${name}=`),
  );
  if (inline) return inline.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Pass --${name} <snapshot-path>.`);
  return value;
}

async function loadSnapshot(option: "before" | "after") {
  const path = resolve(readRequiredOption(option));
  const contents = await readFile(path, "utf8");
  return parseTenantInvariantSnapshot(contents);
}

async function main() {
  const before = await loadSnapshot("before");
  const after = await loadSnapshot("after");
  const report = verifyTenantMigrationInvariants(before, after);

  if (!report.ok) {
    console.error("Tenant migration invariant verification failed:");
    for (const error of report.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Tenant migration invariants verified successfully.\n");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
