export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentConfigurationError";
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new EnvironmentConfigurationError(
      `${name} is required. Set it in the deployment environment before starting the POS.`,
    );
  }

  return value;
}

export function getDatabaseUrl(): string {
  return getRequiredEnv("DATABASE_URL");
}

export function getAuthSessionDays(): number {
  const rawValue = process.env.AUTH_SESSION_DAYS?.trim();

  if (!rawValue) {
    return 7;
  }

  const days = Number(rawValue);
  if (!Number.isInteger(days) || days <= 0) {
    throw new EnvironmentConfigurationError(
      "AUTH_SESSION_DAYS must be a positive whole number of days.",
    );
  }

  return days;
}
