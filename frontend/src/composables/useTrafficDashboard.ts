import { computed, onMounted, ref } from 'vue';
import { createTrafficApi, TrafficApiError } from '../api/traffic';
import type { DashboardData } from '../types/traffic';

export function useTrafficDashboard() {
  const api = createTrafficApi();
  const data = ref<DashboardData | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      data.value = await api.fetchDashboardData();
    } catch (loadError) {
      error.value =
        loadError instanceof TrafficApiError
          ? loadError.message
          : 'Traffic data is unavailable right now.';
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    await load();
  });

  const countryTraffic = computed(() => data.value?.countryTraffic ?? []);
  const vehicleDistribution = computed(() => data.value?.vehicleDistribution ?? []);

  return {
    countryTraffic,
    vehicleDistribution,
    loading,
    error,
    reload: load,
  };
}
