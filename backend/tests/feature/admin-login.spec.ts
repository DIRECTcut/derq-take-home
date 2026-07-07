import jwt from 'jsonwebtoken';
import { buildConfig } from '../../src/config/env.js';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { createTestApp } from '../helpers/testApp.js';
import { testConfig } from '../helpers/testConfig.js';

describe('admin login', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns a short-lived admin jwt for valid credentials', async () => {
    const config = testConfig();
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/login',
        payload: {
          username: config.adminUsername,
          password: config.adminPassword,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        expiresAt: string;
        expiresInSeconds: number;
        token: string;
      }>();

      expect(typeof body.token).toBe('string');
      expect(body.expiresInSeconds).toBe(3600);
      expect(new Date(body.expiresAt).toString()).not.toBe('Invalid Date');

      const decoded = jwt.verify(body.token, config.postgrestJwtSecret) as { role: string };
      expect(decoded.role).toBe(config.postgrestAdminRole);
    } finally {
      await app.close();
    }
  });

  it('rejects invalid credentials', async () => {
    const config = testConfig();
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/login',
        payload: {
          username: config.adminUsername,
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'invalid credentials',
      });
    } finally {
      await app.close();
    }
  });

  it('fails clearly when admin auth config is missing', () => {
    expect(() =>
      buildConfig({
        ADMIN_PASSWORD: '',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:55432/traffic_data',
        POSTGREST_JWT_SECRET: 'super-secret-admin-key-for-local-dev-32',
      }),
    ).toThrowError('ADMIN_USERNAME is required');

    expect(() =>
      buildConfig({
        ADMIN_USERNAME: 'admin',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:55432/traffic_data',
        POSTGREST_JWT_SECRET: 'super-secret-admin-key-for-local-dev-32',
      }),
    ).toThrowError('ADMIN_PASSWORD is required');
  });
});
