import { ref } from 'vue';
import type { AdminRouteName } from './types/admin';

function normalizeRoute(hash: string): AdminRouteName {
  switch (hash) {
    case '#/admin/login':
      return 'admin-login';
    case '#/admin/data':
      return 'admin-data';
    default:
      return 'dashboard';
  }
}

export const currentRoute = ref<AdminRouteName>(normalizeRoute(window.location.hash));

export function syncRouteFromLocation(): void {
  currentRoute.value = normalizeRoute(window.location.hash);
}

export function startRouter(): void {
  window.addEventListener('hashchange', syncRouteFromLocation);
  syncRouteFromLocation();
}

export function stopRouter(): void {
  window.removeEventListener('hashchange', syncRouteFromLocation);
}

export function navigateTo(route: AdminRouteName): void {
  const nextHash =
    route === 'admin-login' ? '#/admin/login' : route === 'admin-data' ? '#/admin/data' : '#/';

  if (window.location.hash === nextHash) {
    syncRouteFromLocation();
    return;
  }

  window.location.hash = nextHash;
}
