<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import AppPageHead from './AppPageHead.vue';

defineProps<{
  title: string;
  subtitle?: string;
  back?: { label: string; to: RouteLocationRaw };
}>();
</script>

<!--
  The frame of an admin page: the same gutter, title, count line and spacing everywhere.
  Anything in the default slot is stacked under the head with an even gap.
-->
<template>
  <div class="app-page">
    <AppPageHead :title="title" :subtitle="subtitle" :back="back">
      <template v-if="$slots.lead" #lead><slot name="lead" /></template>
      <template v-if="$slots.aside" #aside><slot name="aside" /></template>
      <template v-if="$slots.subtitle" #subtitle><slot name="subtitle" /></template>
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </AppPageHead>
    <slot />
  </div>
</template>

<style scoped>
.app-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-inline-size: 0;
  padding: 20px 20px 28px;
}

@media (max-width: 639px) {
  .app-page {
    padding: 14px 12px 24px;
  }
}
</style>
