<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/services/api';

const route = useRoute();
const response = ref('');
const hasToken = ref(false);

async function callbackFromOAuth(refreshToken: string, returnUrl: string) {
  try {
    const res = await api.post(`/api/auth/callback?rt=${refreshToken}`);

    if (res.status === 200) {
      hasToken.value = true;
      location.href = returnUrl || '/';
    } else {
      response.value = 'Error processing refresh token';
    }
  } catch (error) {
    response.value = `Error: ${error.message}`;
  }
}

watch(response, (value) => {
  if (value?.startsWith('Error') && hasToken) {
    setTimeout(() => {
      location.href = '/';
    }, 1000);
  }
});

onMounted(() => {
  const refreshToken = route.query.rt as string || '';
  const returnUrl = route.query.returnUrl as string || '/';

  // Get parameters from query
  if (refreshToken) {
    // Token conversion
    callbackFromOAuth(refreshToken, returnUrl);
  } else {
    response.value = 'No refresh token found';
  }
})
</script>

<template>
  <p v-if="response">{{ response }}</p>
  <p v-else>Processing...</p>
</template>
