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
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/system/runtime',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        service: 'traffic-data-backend',
      });
    } finally {
      await app.close();
    }
  });
});
