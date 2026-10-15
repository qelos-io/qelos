<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { workspaceInitials } from '../services/workspace-presentation';
import { avatarColor } from '@/modules/users/services/user-presentation';

const props = withDefaults(defineProps<{ name?: string; logo?: string; size?: number }>(), { size: 40 });
const broken = ref(false);
watch(() => props.logo, () => (broken.value = false));
const style = computed(() => ({ '--size': props.size + 'px', background: avatarColor(props.name || '?') }));
</script>

<template>
  <span class="ws-avatar" :style="style" role="img" :aria-label="name">
    <img v-if="logo && !broken" :src="logo" alt="" loading="lazy" @error="broken = true" />
    <span v-else aria-hidden="true">{{ workspaceInitials(name) }}</span>
  </span>
</template>

<style scoped>
.ws-avatar {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  inline-size: var(--size);
  block-size: var(--size);
  overflow: hidden;
  border-radius: calc(var(--size) * 0.22);
  color: #fff;
  font-size: calc(var(--size) * 0.38);
  font-weight: 600;
  user-select: none;
}

img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  background: var(--el-bg-color);
}
</style>
