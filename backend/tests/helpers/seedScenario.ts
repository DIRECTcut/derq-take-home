import { Pool } from 'pg';
import { seedTrafficData } from '../../src/lib/db/seedTrafficData.js';
import { testConfig } from './testConfig.js';

export async function seedFullDataset(): Promise<void> {
  const pool = new Pool({
    connectionString: testConfig().databaseUrl,
  });

  try {
    await seedTrafficData(pool);
  } finally {
    await pool.end();
  }
}
