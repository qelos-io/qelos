<template>
  <iframe :src="currentMicroFrontend.frameUrl" ref="iframe"/>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useRouter} from 'vue-router';

const currentRoute = useRouter().currentRoute;
const iframe = ref();
const currentMicroFrontend = computed(() => {
  return {
    frameUrl: currentRoute.value.meta.mfeUrl,
    origin: currentRoute.value.meta.origin
  }
})
let lastOrigin = currentMicroFrontend.value.origin;
watch(currentMicroFrontend, newVal => {
  if (newVal.origin) {
    lastOrigin = newVal.origin;
  }
});

onBeforeUnmount(async() => {
  iframe.value.contentWindow.postMessage('shutdown', lastOrigin);
  await new Promise(res => setTimeout(res, 1000));
})
</script>

<style scoped>
iframe {
  border: none;
}
</style>
