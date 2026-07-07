import path from 'node:path';
import { existsSync } from 'node:fs';
import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { repoRoot } from '../lib/paths.js';

type StaticPluginOptions = {
  config: AppConfig;
};

async function staticPlugin(app: FastifyInstance, options: StaticPluginOptions): Promise<void> {
  const distRoot = path.resolve(repoRoot(), options.config.frontendDistDir);
  const frontendAssetsAvailable = existsSync(distRoot);

  app.decorate('frontendAssetsAvailable', frontendAssetsAvailable);

  if (!frontendAssetsAvailable) {
    return;
  }

  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: '/',
    index: false,
  });
}

export default fp(staticPlugin, {
  name: 'frontend-static',
});
