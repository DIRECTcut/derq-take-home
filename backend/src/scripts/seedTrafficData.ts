import { Pool } from 'pg';
import { buildConfig } from '../config/env.js';
import { seedTrafficData } from '../lib/db/seedTrafficData.js';

async function main(): Promise<void> {
  const config = buildConfig();
  const pool = new Pool({
    connectionString: config.databaseUrl,
  });

  try {
    await seedTrafficData(pool);
  } finally {
    await pool.end();
  }
}

void main();
