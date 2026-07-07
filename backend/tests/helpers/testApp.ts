import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config/env.js';
import { testConfig } from './testConfig.js';

export async function createTestApp(configOverrides: Partial<AppConfig> = {}): Promise<FastifyInstance> {
  return buildApp(testConfig(configOverrides));
}
