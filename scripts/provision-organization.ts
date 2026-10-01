import { createMaintenancePrismaClient } from "../src/lib/prisma";
import { provisionOrganization } from "../src/features/organizations/services/provision-organization";

type CliValues = Partial<Record<
  "organization-name" | "organization-slug" | "outlet-name" | "outlet-slug" |
  "owner-name" | "owner-email" | "time-zone",
  string
>> & { "seed-catalog"?: boolean };

function parseArguments(args: string[]): CliValues {
  const values: CliValues = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--seed-catalog") {
      values["seed-catalog"] = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2) as keyof CliValues;
    if (!["organization-name", "organization-slug", "outlet-name", "outlet-slug", "owner-name", "owner-email", "time-zone"].includes(key)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    values[key as keyof Omit<CliValues, "seed-catalog">] = value;
    index += 1;
  }
  return values;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const ownerPassword = process.env.PROVISION_OWNER_PASSWORD;
  if (!ownerPassword) {
    throw new Error("Set PROVISION_OWNER_PASSWORD in the environment; no password is generated or printed by this script.");
  }
  const required = [
    "organization-name", "organization-slug", "outlet-name", "outlet-slug", "owner-name", "owner-email",
  ] as const;
  const missing = required.filter((key) => !args[key]);
  if (missing.length) throw new Error(`Missing required options: ${missing.map((key) => `--${key}`).join(", ")}`);

  const prisma = createMaintenancePrismaClient();
  try {
    const result = await provisionOrganization({
      organizationName: args["organization-name"]!,
      organizationSlug: args["organization-slug"]!,
      outletName: args["outlet-name"]!,
      outletSlug: args["outlet-slug"]!,
      ownerName: args["owner-name"]!,
      ownerEmail: args["owner-email"]!,
      ownerPassword,
      timeZone: args["time-zone"],
      seedCatalog: args["seed-catalog"] === true,
    }, prisma);
    console.log(`Provisioned organization ${result.organizationId}, outlet ${result.outletId}, owner ${result.ownerUserId}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Organization provisioning failed.");
  process.exitCode = 1;
});
