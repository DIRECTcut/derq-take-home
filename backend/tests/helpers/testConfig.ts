import type { AppConfig } from '../../src/config/env.js';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    adminPassword: process.env.ADMIN_PASSWORD ?? 'local-admin-password',
    adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? 'super-secret-admin-key-for-local-dev-32',
    adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
    databasePoolConnectionTimeoutMs: Number(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? '10000'),
    databasePoolMax: Number(process.env.DATABASE_POOL_MAX ?? '10'),
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/traffic_data',
    frontendDistDir: process.env.FRONTEND_DIST_DIR ?? 'frontend/dist',
    port: 3000,
    ...overrides,
  };
}
