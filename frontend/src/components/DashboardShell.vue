<template>
  <main class="dashboard-shell">
    <nav class="top-nav" aria-label="Primary">
      <p class="top-nav__brand">Traffic Dash</p>
      <div class="top-nav__links">
        <a :href="isAuthenticated ? '#/admin/data' : '#/admin/login'">Admin</a>
      </div>
    </nav>

    <section class="hero-panel">
      <div>
        <p class="eyebrow">Traffic data app</p>
        <h1>Traffic data at a glance</h1>
      </div>
      <p class="hero-panel__body">
        Latest country traffic and vehicle coverage from the seeded dataset.
      </p>
    </section>

    <div v-if="loading" class="status-panel">Loading traffic data…</div>

    <div v-else-if="error" class="status-panel status-panel--error">
      <p>{{ error }}</p>
      <button type="button" class="action-button" @click="reload">Retry</button>
    </div>

    <div v-else-if="countryTraffic.length === 0 && vehicleDistribution.length === 0" class="status-panel">
      No data.
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
import { useAdminSession } from '../composables/useAdminSession';
import { useTrafficDashboard } from '../composables/useTrafficDashboard';

const { countryTraffic, vehicleDistribution, loading, error, reload } = useTrafficDashboard();
const { isAuthenticated } = useAdminSession();
</script>
