<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { avatarColor, initials } from '../services/user-presentation';

const props = withDefaults(defineProps<{ name: string; src?: string; size?: number }>(), { size: 40 });
const broken = ref(false);
watch(() => props.src, () => (broken.value = false));
const label = computed(() => initials(props.name) || '?');
const style = computed(() => ({ '--size': props.size + 'px', background: avatarColor(props.name || '?') }));
</script>

<template>
  <span class="avatar" :style="style" role="img" :aria-label="name">
    <img v-if="src && !broken" :src="src" alt="" loading="lazy" @error="broken = true" />
    <span v-else aria-hidden="true">{{ label }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  inline-size: var(--size);
  block-size: var(--size);
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  font-size: calc(var(--size) * 0.4);
  font-weight: 600;
  user-select: none;
}

img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
</style>
