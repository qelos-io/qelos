<template>
  <slot/>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, onUpdated, onBeforeUnmount, onBeforeUpdate } from 'vue';
import { onBeforeRouteUpdate } from 'vue-router';

const props = defineProps({
  onMounted: {
    type: Function,
    default: () => {}
  },
  onUnmounted: {
    type: Function,
    default: () => {}
  },
  onUpdated: {
    type: Function,
    default: () => {}
  },
  onBeforeUnmount: {
    type: Function,
    default: () => {}
  },
  onBeforeUpdate: {
    type: Function,
    default: () => {}
  },
  onBeforeRouteUpdate: {
    type: Function,
    default: () => {}
  },
})

onMounted(() => {
  props.onMounted();
})

onUnmounted(() => {
  props.onUnmounted();
})

onUpdated(() => {
  props.onUpdated();
})

onBeforeUnmount(() => {
  props.onBeforeUnmount();
})

onBeforeUpdate(() => {
  props.onBeforeUpdate();
})

onBeforeRouteUpdate((to, from) => {
  props.onBeforeRouteUpdate(to, from);
})
</script>
