import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { buildConfig, type AppConfig } from '../../config/env.js';
import { repoRoot } from '../paths.js';
import { runSqlFile } from './runSqlFile.js';

export async function runMigrations(configOverrides?: AppConfig): Promise<void> {
  const config = configOverrides ?? buildConfig();
  const pool = new Pool({
    connectionString: config.databaseUrl,
  });

  try {
    const migrationsDir = path.join(repoRoot(), 'db', 'migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter((entry) => entry.endsWith('.sql'))
      .sort();

    for (const file of files) {
      await runSqlFile(pool, path.join(migrationsDir, file));
    }
  } finally {
    await pool.end();
  }
}
