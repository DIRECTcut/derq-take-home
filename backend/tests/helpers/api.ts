import jwt from 'jsonwebtoken';
import { testConfig } from './testConfig.js';

export function createAdminJwt(): string {
  const config = testConfig();

  return jwt.sign({ scope: 'traffic-data-admin' }, config.adminJwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}
