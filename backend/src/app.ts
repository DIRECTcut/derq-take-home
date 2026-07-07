import Fastify, { type FastifyInstance } from 'fastify';
import { buildConfig, type AppConfig } from './config/env.js';
import dbPlugin from './plugins/db.js';
import postgrestPlugin from './plugins/postgrest.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSystemRoutes } from './routes/system.js';

export async function buildApp(configOverrides?: AppConfig): Promise<FastifyInstance> {
  const config = configOverrides ?? buildConfig();
  const app = Fastify({
    logger: false,
  });

  await app.register(dbPlugin, { config });
  await app.register(postgrestPlugin, { config });

  await registerHealthRoutes(app);
  await registerSystemRoutes(app);

  return app;
}
