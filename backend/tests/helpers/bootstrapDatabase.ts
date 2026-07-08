import { runMigrations } from '../../src/lib/db/runMigrations.js';
import { testConfig } from './testConfig.js';

let initialized = false;

export async function ensureDatabaseInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  await runMigrations(testConfig());
  initialized = true;
}
