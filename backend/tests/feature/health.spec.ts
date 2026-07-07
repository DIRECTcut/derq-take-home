import { buildConfig } from '../../src/config/env.js';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { createTestApp } from '../helpers/testApp.js';

describe('health routes', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('fails clearly when DATABASE_URL is missing', () => {
    expect(() => buildConfig({})).toThrowError('DATABASE_URL is required');
  });

  it('reports liveness', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('reports readiness when PostgreSQL is reachable', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'ok',
        database: 'ready',
      });
    } finally {
      await app.close();
    }
  });
});
