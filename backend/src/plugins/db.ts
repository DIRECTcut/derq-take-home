import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';

type DbPluginOptions = {
  config: AppConfig;
};

async function dbPlugin(app: FastifyInstance, options: DbPluginOptions): Promise<void> {
  const pool = new Pool({
    connectionString: options.config.databaseUrl,
    connectionTimeoutMillis: options.config.databasePoolConnectionTimeoutMs,
    max: options.config.databasePoolMax,
  });

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
}

export default fp(dbPlugin, {
  name: 'db',
});
