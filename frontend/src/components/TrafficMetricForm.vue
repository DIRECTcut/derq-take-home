<template>
  <form class="admin-form" @submit.prevent="emitSubmit">
    <label class="form-field">
      <span>Country</span>
      <select v-model="countryId" name="country">
        <option value="">Select a country</option>
        <option v-for="country in countries" :key="country.id" :value="String(country.id)">
          {{ country.label }}
        </option>
      </select>
    </label>

    <label class="form-field">
      <span>Vehicle type</span>
      <select v-model="vehicleTypeId" name="vehicleType">
        <option value="">Select a vehicle type</option>
        <option v-for="vehicleType in vehicleTypes" :key="vehicleType.id" :value="String(vehicleType.id)">
          {{ vehicleType.label }}
        </option>
      </select>
    </label>

    <div class="form-grid">
      <label class="form-field">
        <span>Year</span>
        <input v-model="timePeriod" type="number" name="timePeriod" min="1900" />
      </label>

      <label class="form-field">
        <span>Value</span>
        <input v-model="observationValue" type="number" name="observationValue" step="0.01" />
      </label>
    </div>

    <div class="form-grid">
      <label class="form-field">
        <span>Observation flag</span>
        <input v-model.trim="observationFlag" name="observationFlag" />
      </label>

      <label class="form-field">
        <span>Confidentiality status</span>
        <input v-model.trim="confidentialityStatus" name="confidentialityStatus" />
      </label>
    </div>

    <p v-if="message" :class="messageClass">{{ message }}</p>

    <button type="submit" class="action-button" :disabled="disabled">
      {{ disabled ? 'Saving…' : 'Save metric' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AdminReferenceOption, TrafficMetricInput } from '../types/admin';

const props = defineProps<{
  countries: AdminReferenceOption[];
  disabled?: boolean;
  error?: string | null;
  success?: string | null;
  vehicleTypes: AdminReferenceOption[];
}>();

const emit = defineEmits<{
  submit: [payload: TrafficMetricInput];
}>();

const confidentialityStatus = ref('');
const countryId = ref('');
const observationFlag = ref('');
const observationValue = ref('');
const timePeriod = ref('');
const vehicleTypeId = ref('');

const message = computed(() => props.error ?? props.success ?? '');
const messageClass = computed(() =>
  props.error ? 'form-message form-message--error' : 'form-message form-message--success',
);

function emitSubmit(): void {
  emit('submit', {
    confidentialityStatus: confidentialityStatus.value,
    countryId: Number(countryId.value),
    observationFlag: observationFlag.value,
    observationValue: Number(observationValue.value),
    timePeriod: Number(timePeriod.value),
    vehicleTypeId: Number(vehicleTypeId.value),
  });
}
</script>
