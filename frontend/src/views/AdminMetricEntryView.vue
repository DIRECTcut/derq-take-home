<template>
  <main class="admin-page">
    <section class="admin-card">
      <div class="admin-card__header">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>Data entry</h1>
        </div>
        <button type="button" class="secondary-button" @click="handleLogout">Log out</button>
      </div>

      <p class="admin-card__body">
        Add one traffic metric using existing countries and vehicle types.
      </p>

      <div v-if="!isAuthenticated" class="status-panel">
        <p>Please sign in first.</p>
        <a href="#/admin/login" class="secondary-link">Go to login</a>
      </div>

      <div v-else-if="loadingOptions" class="status-panel">Loading form options…</div>

      <div v-else-if="optionsError" class="status-panel status-panel--error">
        <p>{{ optionsError }}</p>
        <button type="button" class="action-button" @click="loadOptions">Retry</button>
      </div>

      <TrafficMetricForm
        v-else
        :countries="countries"
        :vehicle-types="vehicleTypes"
        :disabled="submitting"
        :error="submitError"
        :success="submitSuccess"
        @submit="handleSubmit"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AdminReferenceOption, TrafficMetricInput } from '../types/admin';
import TrafficMetricForm from '../components/TrafficMetricForm.vue';
import { useAdminSession } from '../composables/useAdminSession';
import { navigateTo } from '../router';
import { AdminMetricsError, createAdminMetricsApi } from '../api/adminMetrics';

const api = createAdminMetricsApi();
const countries = ref<AdminReferenceOption[]>([]);
const vehicleTypes = ref<AdminReferenceOption[]>([]);
const loadingOptions = ref(true);
const optionsError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitSuccess = ref<string | null>(null);
const submitting = ref(false);
const { isAuthenticated, logout, session } = useAdminSession();

async function loadOptions(): Promise<void> {
  if (!session.value) {
    loadingOptions.value = false;
    return;
  }

  loadingOptions.value = true;
  optionsError.value = null;

  try {
    const options = await api.fetchFormOptions(session.value.token);
    countries.value = options.countries;
    vehicleTypes.value = options.vehicleTypes;
  } catch (loadError) {
    optionsError.value =
      loadError instanceof AdminMetricsError ? loadError.message : 'Unable to load form options.';
  } finally {
    loadingOptions.value = false;
  }
}

async function handleSubmit(payload: TrafficMetricInput): Promise<void> {
  if (!session.value) {
    navigateTo('admin-login');
    return;
  }

  submitting.value = true;
  submitError.value = null;
  submitSuccess.value = null;

  try {
    await api.createTrafficMetric(session.value.token, payload);
    submitSuccess.value = 'Metric saved.';
  } catch (submitErrorValue) {
    submitError.value =
      submitErrorValue instanceof AdminMetricsError
        ? submitErrorValue.message
        : 'Unable to save the metric right now.';
  } finally {
    submitting.value = false;
  }
}

function handleLogout(): void {
  logout();
  navigateTo('admin-login');
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    navigateTo('admin-login');
    return;
  }

  await loadOptions();
});
</script>
