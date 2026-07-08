export type AppConfig = {
  adminPassword: string;
  adminJwtSecret: string;
  adminUsername: string;
  databasePoolConnectionTimeoutMs: number;
  databasePoolMax: number;
  databaseUrl: string;
  frontendDistDir: string;
  port: number;
};

const DEFAULT_PORT = 3000;
const DEFAULT_FRONTEND_DIST_DIR = 'frontend/dist';
const DEFAULT_ADMIN_JWT_SECRET = 'super-secret-admin-key-for-local-dev-32';
const DEFAULT_DATABASE_POOL_MAX = 10;
const DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS = 10_000;

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  variableName: string,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${variableName} value: ${value}`);
  }

  return parsed;
}

export function buildConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const adminUsername = source.ADMIN_USERNAME;
  const adminPassword = source.ADMIN_PASSWORD;
  const databaseUrl = source.DATABASE_URL;

  if (!databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is required');
  }

  if (!adminUsername?.trim()) {
    throw new Error('ADMIN_USERNAME is required');
  }

  if (!adminPassword?.trim()) {
    throw new Error('ADMIN_PASSWORD is required');
  }

  return {
    adminPassword,
    adminJwtSecret: source.ADMIN_JWT_SECRET ?? DEFAULT_ADMIN_JWT_SECRET,
    adminUsername,
    databasePoolConnectionTimeoutMs: parsePositiveInteger(
      source.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      DEFAULT_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      'DATABASE_POOL_CONNECTION_TIMEOUT_MS',
    ),
    databasePoolMax: parsePositiveInteger(
      source.DATABASE_POOL_MAX,
      DEFAULT_DATABASE_POOL_MAX,
      'DATABASE_POOL_MAX',
    ),
    databaseUrl,
    frontendDistDir: source.FRONTEND_DIST_DIR ?? DEFAULT_FRONTEND_DIST_DIR,
    port: parsePort(source.PORT),
  };
}
