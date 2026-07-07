import { computed, ref } from 'vue';
import type { AdminSession } from '../types/admin';
import { createAdminAuthApi, AdminAuthError } from '../api/adminAuth';

const SESSION_STORAGE_KEY = 'traffic-data-admin-session';

function readStoredSession(): AdminSession | null {
  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as AdminSession;

    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      typeof parsed.expiresInSeconds !== 'number'
    ) {
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession(nextSession: AdminSession | null): void {
  if (nextSession) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    return;
  }

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function useAdminSession() {
  const session = ref<AdminSession | null>(readStoredSession());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const api = createAdminAuthApi();

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const nextSession = await api.login({ username, password });
      persistSession(nextSession);
      session.value = nextSession;
      return true;
    } catch (loginError) {
      error.value =
        loginError instanceof AdminAuthError ? loginError.message : 'Unable to sign in right now.';
      persistSession(null);
      session.value = null;
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    error.value = null;
    persistSession(null);
    session.value = null;
  }

  const isAuthenticated = computed(
    () => session.value !== null && Date.parse(session.value.expiresAt) > Date.now(),
  );

  return {
    error,
    isAuthenticated,
    loading,
    login,
    logout,
    session,
  };
}
