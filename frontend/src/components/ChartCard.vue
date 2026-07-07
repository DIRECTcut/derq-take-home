<template>
  <section class="chart-card">
    <div class="chart-card__header">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
      </div>
      <p v-if="description" class="chart-card__description">{{ description }}</p>
    </div>
    <div class="chart-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>
