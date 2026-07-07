<template>
  <main class="admin-page">
    <section class="admin-card">
      <p class="eyebrow">Admin</p>
      <h1>Sign in</h1>
      <p class="admin-card__body">Use your admin credentials to open the data entry screen.</p>

      <form class="admin-form" @submit.prevent="submit">
        <label class="form-field">
          <span>Username</span>
          <input v-model.trim="username" name="username" autocomplete="username" />
        </label>

        <label class="form-field">
          <span>Password</span>
          <input v-model="password" type="password" name="password" autocomplete="current-password" />
        </label>

        <p v-if="error" class="form-message form-message--error">{{ error }}</p>

        <div class="form-actions">
          <button type="submit" class="action-button" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
          <a href="#/" class="secondary-link">Back to dashboard</a>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAdminSession } from '../composables/useAdminSession';
import { navigateTo } from '../router';

const username = ref('');
const password = ref('');
const { error, isAuthenticated, loading, login } = useAdminSession();

onMounted(() => {
  if (isAuthenticated.value) {
    navigateTo('admin-data');
  }
});

async function submit(): Promise<void> {
  const success = await login(username.value, password.value);

  if (success) {
    password.value = '';
    navigateTo('admin-data');
  }
}
</script>
