import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AppConfig } from '../../config/env.js';

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60;

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
  const token = jwt.sign({ role: config.postgrestAdminRole }, config.postgrestJwtSecret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });

  return {
    token,
    expiresAt,
    expiresInSeconds,
  };
}
