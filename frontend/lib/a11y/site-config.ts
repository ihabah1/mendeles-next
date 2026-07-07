/** Public accessibility statement fields — set via env before production launch. */
export type AccessibilitySiteConfig = {
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  statementLastUpdated: string | null;
};

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function getAccessibilitySiteConfig(): AccessibilitySiteConfig {
  return {
    coordinatorName: readEnv("NEXT_PUBLIC_A11Y_COORDINATOR_NAME", "A11Y_COORDINATOR_NAME"),
    coordinatorEmail: readEnv("NEXT_PUBLIC_A11Y_COORDINATOR_EMAIL", "A11Y_COORDINATOR_EMAIL"),
    coordinatorPhone: readEnv("NEXT_PUBLIC_A11Y_COORDINATOR_PHONE", "A11Y_COORDINATOR_PHONE"),
    statementLastUpdated: readEnv("NEXT_PUBLIC_A11Y_STATEMENT_UPDATED", "A11Y_STATEMENT_UPDATED"),
  };
}

export function isAccessibilityCoordinatorConfigured(config: AccessibilitySiteConfig): boolean {
  return Boolean(config.coordinatorName || config.coordinatorEmail || config.coordinatorPhone);
}
