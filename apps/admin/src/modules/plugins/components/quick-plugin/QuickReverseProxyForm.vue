<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const emit = defineEmits(['changed']);

const apiPath = ref('');
const proxyUrl = ref('');
const manualToken = ref('');
const apiPathLabel = computed(() => `Every call to ${location.protocol}//${location.host}/api/on/${apiPath.value}/*`);
const proxyUrlLabel = computed(() => `Will proxy to ${proxyUrl.value}/*`);

watch([apiPath, proxyUrl, manualToken], () => {
  emit('changed', { apiPath: apiPath.value, proxyUrl: proxyUrl.value, token: manualToken.value, name: apiPath.value + '-proxy' });
});
</script>
<template>
    <FormInput title="API Path" required :label="apiPathLabel" v-model="apiPath"/>
    <FormInput type="url" required title="Proxy URL" :label="proxyUrlLabel" v-model="proxyUrl"/>
    <FormInput type="password" required title="Manual Token" label="Qelos will use this token as Bearer token" v-model="manualToken"/>
</template>