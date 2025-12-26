<template>
  <iframe :src="currentMicroFrontend.frameUrl" ref="iframe"/>
</template>

<script setup lang="ts">
import {computed, nextTick, onUnmounted, toRef, watch} from 'vue';
import {onBeforeRouteLeave, useRouter} from 'vue-router';
import { useMfeCommunication } from '@/modules/plugins/store/mfe-communication';

const mfeCommunicationStore = useMfeCommunication();
const iframe = toRef(mfeCommunicationStore, 'iframe');
const currentRoute = useRouter().currentRoute;
const currentMicroFrontend = computed(() => {
  return {
    frameUrl: currentRoute.value.meta.mfeUrl,
    origin: currentRoute.value.meta.origin
  }
})
mfeCommunicationStore.lastOrigin = currentMicroFrontend.value.origin;
watch(currentMicroFrontend, newVal => {
  if (newVal.origin) {
    mfeCommunicationStore.lastOrigin = newVal.origin;
  }
});

onUnmounted(() => {
  iframe.value = null
})

onBeforeRouteLeave(async () => {
  mfeCommunicationStore.shutdownMfe()
  await nextTick()
})

watch(currentRoute, mfeCommunicationStore.triggerRouteChanged);
</script>

<style scoped>
iframe {
  border: none;
}
</style>
