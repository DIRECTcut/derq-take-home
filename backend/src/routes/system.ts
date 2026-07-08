import type { FastifyInstance } from 'fastify';

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/system/runtime', async () => ({
    frontendAssetsAvailable: app.frontendAssetsAvailable,
    nodeVersion: process.version,
    service: 'traffic-data-backend',
  }));
}
