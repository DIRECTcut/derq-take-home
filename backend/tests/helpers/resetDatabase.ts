import { Pool } from 'pg';
import { testConfig } from './testConfig.js';

export async function resetDatabase(): Promise<void> {
  const pool = new Pool({
    connectionString: testConfig().databaseUrl,
  });

  try {
    await pool.query('truncate table api.traffic_metrics, api.vehicle_types, api.countries restart identity cascade');
  } finally {
    await pool.end();
  }
}
