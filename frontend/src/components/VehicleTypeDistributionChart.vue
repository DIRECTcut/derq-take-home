<template>
  <ChartCard
    eyebrow="Vehicle view"
    title="Current vehicle-type coverage"
    description="The seeded dataset currently exposes one vehicle category, so the distribution is shown as a single-category snapshot."
  >
    <div v-if="rows.length === 0" class="empty-state">
      No vehicle distribution values are available yet.
    </div>
    <div v-else class="vehicle-chart">
      <div class="vehicle-chart__hero">
        <div class="vehicle-chart__single-bar">
          <span class="vehicle-chart__bar-fill" style="width: 100%"></span>
        </div>
        <div>
          <p class="vehicle-chart__title">{{ primary.vehicleTypeName }}</p>
          <p class="vehicle-chart__subtitle">{{ primary.unit }}</p>
        </div>
      </div>
      <dl class="vehicle-chart__stats">
        <div>
          <dt>Countries reported</dt>
          <dd>{{ primary.countriesReported }}</dd>
        </div>
        <div>
          <dt>Average latest value</dt>
          <dd>{{ primary.averageObservationValue.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>Total latest value</dt>
          <dd>{{ primary.totalObservationValue.toFixed(2) }}</dd>
        </div>
      </dl>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChartCard from './ChartCard.vue';
import type { VehicleDistributionDatum } from '../types/traffic';

const props = defineProps<{
  rows: VehicleDistributionDatum[];
}>();

const primary = computed(() => props.rows[0]);
</script>
