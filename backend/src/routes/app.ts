import type { FastifyInstance } from 'fastify';

export async function registerAppRoutes(app: FastifyInstance): Promise<void> {
  app.get('/app-config.js', async (_request, reply) => {
    return reply
      .type('application/javascript; charset=utf-8')
      .send(
        'window.__TRAFFIC_DATA_CONFIG__ = { apiBaseUrl: window.location.origin, adminApiBaseUrl: window.location.origin };',
      );
  });

  app.get('/', async (_request, reply) => {
    if (!app.frontendAssetsAvailable) {
      return reply.code(503).send({
        error: 'frontend_assets_unavailable',
      });
    }

    return reply.sendFile('index.html');
  });
}
