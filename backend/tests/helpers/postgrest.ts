import jwt from 'jsonwebtoken';
import { testConfig } from './testConfig.js';

export function createAdminJwt(): string {
  const config = testConfig();
  return jwt.sign({ role: config.postgrestAdminRole }, config.postgrestJwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

export async function postgrestFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const config = testConfig();
  return fetch(`${config.postgrestBaseUrl}${path}`, init);
}
