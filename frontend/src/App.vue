<template>
  <DashboardShell v-if="route === 'dashboard'" />
  <AdminLoginView v-else-if="route === 'admin-login'" />
  <AdminMetricEntryView v-else />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AdminLoginView from './views/AdminLoginView.vue';
import AdminMetricEntryView from './views/AdminMetricEntryView.vue';
import DashboardShell from './components/DashboardShell.vue';
import { currentRoute, startRouter, stopRouter } from './router';

const route = currentRoute;

onMounted(() => {
  startRouter();
});

onUnmounted(() => {
  stopRouter();
});
</script>
