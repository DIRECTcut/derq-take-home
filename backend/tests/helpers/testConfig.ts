import type { AppConfig } from '../../src/config/env.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/traffic_data',
    port: 3000,
    postgrestBaseUrl: process.env.POSTGREST_BASE_URL ?? 'http://localhost:3001',
    postgrestJwtSecret: process.env.POSTGREST_JWT_SECRET ?? 'super-secret-admin-key-for-local-dev-32',
    postgrestAnonRole: process.env.POSTGREST_ANON_ROLE ?? 'web_anon',
    postgrestAdminRole: process.env.POSTGREST_ADMIN_ROLE ?? 'traffic_admin',
    ...overrides,
  };
}
