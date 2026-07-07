import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health/live', async () => ({
    status: 'ok',
  }));

  app.get('/health/ready', async () => {
    await app.db.query('select 1');

    return {
      status: 'ok',
      database: 'ready',
      postgrestBaseUrl: app.postgrestBaseUrl,
    };
  });
}
