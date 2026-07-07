import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export function backendRoot(): string {
  return path.resolve(currentDir, '../..');
}

export function repoRoot(): string {
  return path.resolve(currentDir, '../../..');
}
