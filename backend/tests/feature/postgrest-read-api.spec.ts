import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { createTestApp } from '../helpers/testApp.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { seedFullDataset } from '../helpers/seedScenario.js';

describe('fastify read api', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedFullDataset();
  });

  it('returns seeded chart data from the latest country view', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/country-traffic',
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<Array<{
        country_code: string;
        time_period: number;
        observation_value: number;
      }>>();

      expect(body.find((row) => row.country_code === 'AL')).toMatchObject({
        country_code: 'AL',
        time_period: 2024,
        observation_value: 328,
      });
    } finally {
      await app.close();
    }
  });

  it('returns distribution data from the vehicle type summary view', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/vehicle-distribution',
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<Array<{
        vehicle_type_slug: string;
        countries_reported: number;
      }>>();

      expect(body[0].vehicle_type_slug).toBe('passenger-cars-per-thousand-inhabitants');
      expect(body[0].countries_reported).toBeGreaterThan(1);
    } finally {
      await app.close();
    }
  });
});
