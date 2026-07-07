import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';

type PostgrestPluginOptions = {
  config: AppConfig;
};

async function postgrestPlugin(app: FastifyInstance, options: PostgrestPluginOptions): Promise<void> {
  app.decorate('postgrestBaseUrl', options.config.postgrestBaseUrl);
}

export default fp(postgrestPlugin, {
  name: 'postgrest-config',
});
