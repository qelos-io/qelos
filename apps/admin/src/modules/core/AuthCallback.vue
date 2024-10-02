<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/services/api';

const route = useRoute();
const router = useRouter();
const response = ref('');

async function callbackFromOAuth(refreshToken: string, returnUrl: string) {
  try {
    const res = await api.post(`/api/auth/callback?rt=${refreshToken}`);

    if (res.status === 200) {
      // After a successful request, redirect to returnUrl
      await router.push(returnUrl || '/');
    } else {
      response.value = 'Error processing refresh token';
    }
  } catch (error) {
    response.value = `Error: ${error.message}`;
  }
}

// Get parameters from query
const refreshToken = route.query.rt as string || '';
const returnUrl = route.query.returnUrl as string || '/';

if (refreshToken) {
  // Token conversion
  callbackFromOAuth(refreshToken, returnUrl);
} else {
  response.value = 'No refresh token found';
}
</script>

<template>
  <p v-if="response">{{ response }}</p>
  <p v-else>Processing...</p>
</template>
