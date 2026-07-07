<template>
  <main class="dashboard-shell">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Traffic data app</p>
        <h1>Country traffic and vehicle coverage at a glance</h1>
      </div>
      <p class="hero-panel__body">
        The frontend stays intentionally thin. It reads PostgREST-backed views and shows the latest seeded dataset without reshaping the backend contract in the browser.
      </p>
    </section>

    <div v-if="loading" class="status-panel">Loading traffic data…</div>

    <div v-else-if="error" class="status-panel status-panel--error">
      <p>{{ error }}</p>
      <button type="button" class="action-button" @click="reload">Retry</button>
    </div>

    <div v-else-if="countryTraffic.length === 0 && vehicleDistribution.length === 0" class="status-panel">
      The dashboard has no seeded data to show yet.
    </div>

    <section v-else class="dashboard-grid">
      <CountryTrafficChart :rows="countryTraffic" />
      <VehicleTypeDistributionChart :rows="vehicleDistribution" />
    </section>
  </main>
</template>

<script setup lang="ts">
import CountryTrafficChart from './CountryTrafficChart.vue';
import VehicleTypeDistributionChart from './VehicleTypeDistributionChart.vue';
import { useTrafficDashboard } from '../composables/useTrafficDashboard';

const { countryTraffic, vehicleDistribution, loading, error, reload } = useTrafficDashboard();
</script>
