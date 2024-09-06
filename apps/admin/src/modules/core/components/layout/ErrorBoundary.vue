<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { isPrivilegedUser } from '@/modules/core/store/auth';

const emit = defineEmits(['error'])

const error = ref()
onErrorCaptured((err) => {
  error.value = err;
  emit('error', err);

  console.error(err);
  return false;
})
</script>

<template>
  <main v-if="error" class="container">
    <h3>{{$t('Something went wrong rendering this page.')}}</h3>
    <pre v-if="isPrivilegedUser">{{ error }}</pre>
  </main>
  <slot v-else/>
</template>