import Fastify, { type FastifyInstance } from 'fastify';
import { buildConfig, type AppConfig } from './config/env.js';
import dbPlugin from './plugins/db.js';
import postgrestPlugin from './plugins/postgrest.js';
import staticPlugin from './plugins/static.js';
import { registerAdminAuthRoutes } from './routes/adminAuth.js';
import { registerAppRoutes } from './routes/app.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSystemRoutes } from './routes/system.js';

export async function buildApp(configOverrides?: AppConfig): Promise<FastifyInstance> {
  const config = configOverrides ?? buildConfig();
  const app = Fastify({
    logger: false,
  });

  await app.register(dbPlugin, { config });
  await app.register(postgrestPlugin, { config });
  await app.register(staticPlugin, { config });

  await registerHealthRoutes(app);
  await registerSystemRoutes(app);
  await registerAdminAuthRoutes(app, { config });
  await registerAppRoutes(app);

  return app;
}
