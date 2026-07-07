import { runMigrations } from '../../src/lib/db/runMigrations.js';

let initialized = false;

export async function ensureDatabaseInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  await runMigrations();
  initialized = true;
}
