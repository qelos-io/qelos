<script setup lang="ts">
import { computed } from 'vue';

const model = defineModel<number>()

const props = defineProps<{
  onIcon?: string,
  offIcon?: string,
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse',
}>()

const flexDirection = computed(() => {
  return props.direction || 'row'
})
</script>

<template>
  <Rating v-model="model" class="rating">
    <template v-if="onIcon" #onicon>
      <img :src="onIcon" alt="Rate On" height="24" width="24"/>
    </template>
    <template v-if="offIcon" #officon>
      <img :src="offIcon" alt="Rate Off" height="24" width="24"/>
    </template>
  </Rating>
</template>
<style scoped>
.rating {
  flex-direction: v-bind(flexDirection);
}
</style>