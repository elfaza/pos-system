import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function runVercelBuild(env = process.env, run = spawnSync) {
  const production = env.VERCEL_ENV === "production";
  if (production && env.VERCEL_GIT_COMMIT_REF !== "master") {
    throw new Error("Production builds must use master. Database migrations were not run.");
  }

  const steps = ["prisma:generate", "build"];
  console.log("Database migrations run separately from Vercel builds.");

  for (const step of steps) {
    const result = run("npm", ["run", step], { stdio: "inherit", env });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`${step} failed; build stopped.`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runVercelBuild();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
