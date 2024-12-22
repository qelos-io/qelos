<script setup lang="ts">
defineModel<number>()

defineProps<{
  onIcon?: string,
  offIcon?: string,
}>()
</script>

<template>
  <Rating v-model="modelValue">
    <template v-if="onIcon" #onicon>
      <img :src="onIcon" alt="Rate On" height="24" width="24"/>
    </template>
    <template v-if="offIcon" #officon>
      <img :src="offIcon" alt="Rate Off" height="24" width="24"/>
    </template>
  </Rating>
</template>