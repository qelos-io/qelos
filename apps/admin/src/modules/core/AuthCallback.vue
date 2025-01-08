<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/services/api';

const route = useRoute();
const router = useRouter();
const response = ref('');
const hasToken = ref(false);

const refreshToken = route.query.rt as string || '';
const returnUrl = route.query.returnUrl as string || '/';

async function callbackFromOAuth(refreshToken: string, returnUrl: string) {
  try {
    const res = await api.post(`/api/auth/callback?rt=${refreshToken}`);

    if (res.status === 200) {
      hasToken.value = true;
    } else {
      response.value = 'Error processing refresh token';
    }
  } catch (error) {
    response.value = `Error: ${error.message}`;
  }
}

watch(hasToken, (newVal) => {
  if (newVal) {
    router.push(returnUrl || '/');
  }
});

onMounted(() => {
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
  <p v-else-if="hasToken">
    <router-link :to="returnUrl">{{ $t('Go to home') }}</router-link>
  </p>
  <p v-else>Processing...</p>
</template>
