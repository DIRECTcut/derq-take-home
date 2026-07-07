<template>
  <ChartCard
    eyebrow="Country view"
    title="Latest traffic values by country"
    description="Latest reported passenger-car metric values, sorted from highest to lowest."
  >
    <div v-if="rows.length === 0" class="empty-state">
      No country traffic values are available yet.
    </div>
    <div v-else class="country-chart">
      <svg
        class="country-chart__svg"
        viewBox="0 0 860 360"
        role="img"
        aria-label="Country-wise traffic bar chart"
      >
        <line x1="100" y1="20" x2="100" y2="320" class="axis-line" />
        <line x1="100" y1="320" x2="820" y2="320" class="axis-line" />
        <g v-for="(row, index) in rows" :key="row.countryCode" :transform="`translate(0, ${40 + index * 52})`">
          <text x="92" y="16" text-anchor="end" class="chart-label">
            {{ row.countryCode }}
          </text>
          <rect x="110" y="0" :width="barWidth(row.observationValue)" height="24" rx="6" class="chart-bar" />
          <text :x="118 + barWidth(row.observationValue)" y="16" class="chart-value">
            {{ Math.round(row.observationValue) }}
          </text>
        </g>
      </svg>
      <ol class="country-chart__table">
        <li v-for="row in rows" :key="row.countryCode">
          <span>{{ row.countryName }}</span>
          <strong>{{ Math.round(row.observationValue) }}</strong>
        </li>
      </ol>
    </div>
  </ChartCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChartCard from './ChartCard.vue';
import type { CountryTrafficDatum } from '../types/traffic';

const props = defineProps<{
  rows: CountryTrafficDatum[];
}>();

const maxValue = computed(() => Math.max(...props.rows.map((row) => row.observationValue), 1));

function barWidth(value: number): number {
  return Math.max((value / maxValue.value) * 660, 12);
}
</script>
