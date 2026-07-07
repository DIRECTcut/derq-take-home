export type AppConfig = {
  databaseUrl: string;
  frontendDistDir: string;
  port: number;
  postgrestBaseUrl: string;
  postgrestJwtSecret: string;
  postgrestAnonRole: string;
  postgrestAdminRole: string;
};

const DEFAULT_PORT = 3000;
const DEFAULT_FRONTEND_DIST_DIR = 'frontend/dist';
const DEFAULT_POSTGREST_BASE_URL = 'http://localhost:3001';
const DEFAULT_POSTGREST_JWT_SECRET = 'super-secret-admin-key-for-local-dev-32';
const DEFAULT_POSTGREST_ANON_ROLE = 'web_anon';
const DEFAULT_POSTGREST_ADMIN_ROLE = 'traffic_admin';

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

export function buildConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = source.DATABASE_URL;

  if (!databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    databaseUrl,
    frontendDistDir: source.FRONTEND_DIST_DIR ?? DEFAULT_FRONTEND_DIST_DIR,
    port: parsePort(source.PORT),
    postgrestBaseUrl: source.POSTGREST_BASE_URL ?? DEFAULT_POSTGREST_BASE_URL,
    postgrestJwtSecret: source.POSTGREST_JWT_SECRET ?? DEFAULT_POSTGREST_JWT_SECRET,
    postgrestAnonRole: source.POSTGREST_ANON_ROLE ?? DEFAULT_POSTGREST_ANON_ROLE,
    postgrestAdminRole: source.POSTGREST_ADMIN_ROLE ?? DEFAULT_POSTGREST_ADMIN_ROLE,
  };
}
