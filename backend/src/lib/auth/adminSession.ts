import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AppConfig } from '../../config/env.js';

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60;
const ADMIN_TOKEN_SCOPE = 'traffic-data-admin';

type AdminSessionJwtPayload = {
  scope: typeof ADMIN_TOKEN_SCOPE;
};

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(
  username: string,
  password: string,
  config: AppConfig,
): boolean {
  return secureEquals(username, config.adminUsername) && secureEquals(password, config.adminPassword);
}

export function createAdminSessionToken(config: AppConfig): {
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
} {
  const expiresInSeconds = ADMIN_TOKEN_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const token = jwt.sign({ scope: ADMIN_TOKEN_SCOPE }, config.adminJwtSecret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });

  return {
    token,
    expiresAt,
    expiresInSeconds,
  };
}

export function verifyAdminSessionToken(token: string, config: AppConfig): AdminSessionJwtPayload {
  const payload = jwt.verify(token, config.adminJwtSecret) as Partial<AdminSessionJwtPayload>;

  if (payload.scope !== ADMIN_TOKEN_SCOPE) {
    throw new Error('invalid scope');
  }

  return {
    scope: ADMIN_TOKEN_SCOPE,
  };
}
