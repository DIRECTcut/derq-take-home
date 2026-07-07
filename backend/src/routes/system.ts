import type { FastifyInstance } from 'fastify';

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/system/runtime', async () => ({
    service: 'traffic-data-backend',
    nodeVersion: process.version,
    postgrestBaseUrl: app.postgrestBaseUrl,
  }));
}
