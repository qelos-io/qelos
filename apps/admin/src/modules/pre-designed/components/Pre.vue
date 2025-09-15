<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ value: string }>()

const valueAsSfeHTML = computed(() => {
  if (!props.value) return '';
  return props.value.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\n/g, '<br/>');
})
</script>

<template>
  <div class="pre" v-html="valueAsSfeHTML"></div>
</template>

<style scoped>
.pre {
  white-space: pre-wrap;
}
</style>