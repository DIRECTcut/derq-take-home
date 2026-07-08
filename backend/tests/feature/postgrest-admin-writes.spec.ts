import { Pool } from 'pg';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { createAdminJwt } from '../helpers/api.js';
import { createTestApp } from '../helpers/testApp.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { seedFullDataset } from '../helpers/seedScenario.js';
import { testConfig } from '../helpers/testConfig.js';

describe('fastify admin data routes', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedFullDataset();
  });

  it('rejects unauthenticated writes', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/vehicle-types',
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('returns admin-only reference data', async () => {
    const jwt = createAdminJwt();
    const app = await createTestApp();

    try {
      const [countriesResponse, vehicleTypesResponse] = await Promise.all([
        app.inject({
          method: 'GET',
          url: '/api/admin/countries',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }),
        app.inject({
          method: 'GET',
          url: '/api/admin/vehicle-types',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }),
      ]);

      expect(countriesResponse.statusCode).toBe(200);
      expect(vehicleTypesResponse.statusCode).toBe(200);

      const countries = countriesResponse.json<Array<{ code: string; id: number; name: string }>>();
      const vehicleTypes = vehicleTypesResponse.json<Array<{ id: number; name: string; unit: string }>>();

      expect(countries[0]).toMatchObject({
        code: 'AL',
        name: 'Albania',
      });
      expect(vehicleTypes[0]).toMatchObject({
        name: 'Passenger cars - per thousand inhabitants',
      });
    } finally {
      await app.close();
    }
  });

  it('allows admin-authenticated writes', async () => {
    const jwt = createAdminJwt();
    const app = await createTestApp();
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      const referenceRows = await pool.query<{
        country_id: number;
        vehicle_type_id: number;
      }>(`
        select
          (select id from api.countries where code = 'AL') as country_id,
          (select id from api.vehicle_types where slug = 'passenger-cars-per-thousand-inhabitants') as vehicle_type_id
      `);

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/traffic-metrics',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        payload: {
          countryId: referenceRows.rows[0].country_id,
          vehicleTypeId: referenceRows.rows[0].vehicle_type_id,
          timePeriod: 2025,
          observationValue: 333.33,
          observationFlag: 'p',
          confidentialityStatus: 'public',
        },
      });

      expect(response.statusCode).toBe(201);

      const result = await pool.query<{ count: string }>(
        `
          select count(*)::text as count
          from api.traffic_metrics tm
          join api.countries c on c.id = tm.country_id
          join api.vehicle_types vt on vt.id = tm.vehicle_type_id
          where c.code = 'AL'
            and vt.slug = 'passenger-cars-per-thousand-inhabitants'
            and tm.time_period = 2025
        `,
      );

      expect(Number(result.rows[0].count)).toBe(1);
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it('returns a conflict for duplicate writes', async () => {
    const jwt = createAdminJwt();
    const app = await createTestApp();
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      const referenceRows = await pool.query<{
        country_id: number;
        vehicle_type_id: number;
      }>(`
        select
          (select id from api.countries where code = 'AL') as country_id,
          (select id from api.vehicle_types where slug = 'passenger-cars-per-thousand-inhabitants') as vehicle_type_id
      `);

      const payload = {
        countryId: referenceRows.rows[0].country_id,
        vehicleTypeId: referenceRows.rows[0].vehicle_type_id,
        timePeriod: 2024,
        observationValue: 328,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/traffic-metrics',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(409);
    } finally {
      await app.close();
      await pool.end();
    }
  });
});
