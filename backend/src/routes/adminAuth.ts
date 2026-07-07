import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { createAdminSessionToken, verifyAdminCredentials } from '../lib/auth/adminSession.js';

type AdminAuthRouteOptions = {
  config: AppConfig;
};

type AdminLoginBody = {
  password?: string;
  username?: string;
};

export async function registerAdminAuthRoutes(
  app: FastifyInstance,
  options: AdminAuthRouteOptions,
): Promise<void> {
  app.post<{ Body: AdminLoginBody }>('/admin/login', async (request, reply) => {
    const username = request.body?.username?.trim();
    const password = request.body?.password;

    if (!username || !password) {
      return reply.code(400).send({
        error: 'username and password are required',
      });
    }

    if (!verifyAdminCredentials(username, password, options.config)) {
      return reply.code(401).send({
        error: 'invalid credentials',
      });
    }

    return reply.code(200).send(createAdminSessionToken(options.config));
  });
}
