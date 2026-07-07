import { Pool } from 'pg';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { createAdminJwt, postgrestFetch } from '../helpers/postgrest.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { seedFullDataset } from '../helpers/seedScenario.js';
import { testConfig } from '../helpers/testConfig.js';

describe('postgrest admin-only writes', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedFullDataset();
  });

  it('rejects unauthenticated writes', async () => {
    const response = await postgrestFetch('/vehicle_types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          slug: 'commercial-vehicles',
          name: 'Commercial vehicles',
          unit: 'NR',
        },
      ]),
    });

    expect(response.status).toBe(401);
  });

  it('allows admin-authenticated writes', async () => {
    const jwt = createAdminJwt();
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

      const response = await postgrestFetch('/traffic_metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify([
          {
            country_id: referenceRows.rows[0].country_id,
            vehicle_type_id: referenceRows.rows[0].vehicle_type_id,
            time_period: 2025,
            observation_value: 333.33,
            observation_flag: 'p',
            confidentiality_status: 'public',
          },
        ]),
      });

      expect(response.status).toBe(201);

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
      await pool.end();
    }
  });
});
