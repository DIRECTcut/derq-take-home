import type { AdminSession } from '../types/admin';

const DEFAULT_ADMIN_API_BASE_URL = 'http://localhost:3000';

type EnvSource = {
  VITE_ADMIN_API_BASE_URL?: string;
};

type AdminLoginPayload = {
  password: string;
  username: string;
};

type AdminLoginResponse = {
  expiresAt: string;
  expiresInSeconds: number;
  token: string;
};

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export function resolveAdminApiBaseUrl(env: EnvSource = import.meta.env as EnvSource): string {
  const candidate =
    window.__TRAFFIC_DATA_CONFIG__?.adminApiBaseUrl ??
    env.VITE_ADMIN_API_BASE_URL ??
    window.location.origin ??
    DEFAULT_ADMIN_API_BASE_URL;

  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    throw new AdminAuthError(`Invalid VITE_ADMIN_API_BASE_URL value: ${candidate}`);
  }
}

export function createAdminAuthApi(baseUrl = resolveAdminApiBaseUrl()) {
  return {
    async login(payload: AdminLoginPayload): Promise<AdminSession> {
      const response = await fetch(`${baseUrl}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Unable to sign in right now.';

        try {
          const body = (await response.json()) as { error?: string };
          if (body.error === 'invalid credentials') {
            errorMessage = 'Invalid username or password.';
          } else if (body.error) {
            errorMessage = body.error;
          }
        } catch {
          // Fall back to the generic error message.
        }

        throw new AdminAuthError(errorMessage);
      }

      const body = (await response.json()) as Partial<AdminLoginResponse>;

      if (
        typeof body.token !== 'string' ||
        typeof body.expiresAt !== 'string' ||
        typeof body.expiresInSeconds !== 'number'
      ) {
        throw new AdminAuthError('Received malformed admin login response');
      }

      return {
        expiresAt: body.expiresAt,
        expiresInSeconds: body.expiresInSeconds,
        token: body.token,
        username: payload.username,
      };
    },
  };
}
