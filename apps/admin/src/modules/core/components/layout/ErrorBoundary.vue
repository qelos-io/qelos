<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { isPrivilegedUser } from '@/modules/core/store/auth';

const error = ref()
onErrorCaptured((err) => {
  error.value = err;
  return false
})
isPrivilegedUser
</script>

<template>
  <main v-if="error" class="container">
    <h3>{{$t('Something went wrong rendering this page.')}}</h3>
    <pre v-if="isPrivilegedUser">{{ error }}</pre>
  </main>
  <slot v-else/>
</template>