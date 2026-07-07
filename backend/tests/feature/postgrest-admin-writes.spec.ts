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
    const response = await postgrestFetch('/vehicle_types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify([
        {
          slug: 'commercial-vehicles',
          name: 'Commercial vehicles',
          unit: 'NR',
        },
      ]),
    });

    expect(response.status).toBe(201);

    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      const result = await pool.query<{ count: string }>(
        "select count(*)::text as count from api.vehicle_types where slug = 'commercial-vehicles'",
      );

      expect(Number(result.rows[0].count)).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
