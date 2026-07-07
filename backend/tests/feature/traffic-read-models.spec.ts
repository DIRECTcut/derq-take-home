import { Pool } from 'pg';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { seedFullDataset } from '../helpers/seedScenario.js';
import { testConfig } from '../helpers/testConfig.js';

describe('traffic read models', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedFullDataset();
  });

  it('returns one latest row per country and vehicle type', async () => {
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      const result = await pool.query<{
        country_code: string;
        time_period: number;
      }>('select country_code, time_period from api.country_traffic_latest order by country_code asc limit 3');

      expect(result.rows[0].country_code).toBe('AL');
      expect(result.rows[0].time_period).toBe(2024);
      expect(result.rows.length).toBe(3);
    } finally {
      await pool.end();
    }
  });

  it('returns a vehicle type distribution summary', async () => {
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      const result = await pool.query<{
        vehicle_type_slug: string;
        countries_reported: number;
      }>('select vehicle_type_slug, countries_reported from api.vehicle_type_distribution_latest');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].vehicle_type_slug).toBe('passenger-cars-per-thousand-inhabitants');
      expect(result.rows[0].countries_reported).toBeGreaterThan(1);
    } finally {
      await pool.end();
    }
  });
});
