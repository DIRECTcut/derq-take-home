import fs from 'node:fs/promises';
import type { Pool } from 'pg';

export async function runSqlFile(pool: Pool, filePath: string): Promise<void> {
  const sql = await fs.readFile(filePath, 'utf8');
  await pool.query(sql);
}
