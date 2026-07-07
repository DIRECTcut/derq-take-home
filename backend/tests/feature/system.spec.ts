import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { createTestApp } from '../helpers/testApp.js';

describe('system runtime routes', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('exposes only operational runtime metadata', async () => {
    const app = await createTestApp({
      frontendDistDir: 'frontend/does-not-exist',
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/system/runtime',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        frontendAssetsAvailable: false,
        service: 'traffic-data-backend',
      });
    } finally {
      await app.close();
    }
  });

  it('serves the frontend entrypoint when assets are present', async () => {
    const app = await createTestApp({
      frontendDistDir: 'backend/tests/fixtures/frontend-dist',
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<title>Fixture frontend</title>');
    } finally {
      await app.close();
    }
  });
});
