import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { defaultTrafficCsvPath, seedTrafficData } from '../../src/lib/db/seedTrafficData.js';
import { ensureDatabaseInitialized } from '../helpers/bootstrapDatabase.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { testConfig } from '../helpers/testConfig.js';

async function metricCount(): Promise<number> {
  const pool = new Pool({
    connectionString: testConfig().databaseUrl,
  });

  try {
    const result = await pool.query<{ count: string }>('select count(*)::text as count from api.traffic_metrics');
    return Number(result.rows[0].count);
  } finally {
    await pool.end();
  }
}

describe('traffic data seeder', () => {
  beforeAll(async () => {
    await ensureDatabaseInitialized();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('loads the CSV into PostgreSQL', async () => {
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      await seedTrafficData(pool);
    } finally {
      await pool.end();
    }

    expect(await metricCount()).toBeGreaterThan(0);
  });

  it('is rerunnable without creating duplicate metrics', async () => {
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });

    try {
      await seedTrafficData(pool);
      const firstCount = await metricCount();
      await seedTrafficData(pool);
      const secondCount = await metricCount();

      expect(secondCount).toBe(firstCount);
    } finally {
      await pool.end();
    }
  });

  it('fails cleanly on malformed input', async () => {
    const pool = new Pool({
      connectionString: testConfig().databaseUrl,
    });
    const badFilePath = path.join(path.dirname(defaultTrafficCsvPath()), 'bad-fixture.csv');

    try {
      await fs.writeFile(badFilePath, 'STRUCTURE_NAME,geo,TIME_PERIOD,OBS_VALUE\nPassenger cars,AL,not-a-year,abc\n');

      await expect(seedTrafficData(pool, badFilePath)).rejects.toThrow();
    } finally {
      await fs.rm(badFilePath, { force: true });
      await pool.end();
    }
  });
});
