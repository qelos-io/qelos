<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import RuntimeTemplate from '@/modules/core/components/layout/RuntimeTemplate.vue';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';

/** A tiny, non-interactive rendering of a content box, drawn only once it scrolls into view. */
defineProps<{ content?: string | null }>();

const CANVAS_WIDTH = 1000;
const root = ref<HTMLElement>();
const visible = ref(false);
const scale = ref(0.3);
let intersection: IntersectionObserver | undefined;
let resize: ResizeObserver | undefined;

onMounted(() => {
  if (!root.value) return;
  resize = new ResizeObserver(([entry]) => (scale.value = entry.contentRect.width / CANVAS_WIDTH));
  resize.observe(root.value);
  intersection = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true;
        intersection?.disconnect();
      }
    },
    { rootMargin: '120px' },
  );
  intersection.observe(root.value);
});

onBeforeUnmount(() => {
  intersection?.disconnect();
  resize?.disconnect();
});
</script>

<template>
  <div ref="root" class="thumb" aria-hidden="true">
    <div v-if="visible && content" class="canvas" :style="{ transform: `scale(${scale})` }" inert>
      <ErrorBoundary><RuntimeTemplate :template="content" /></ErrorBoundary>
    </div>
    <span v-else-if="visible" class="empty">{{ $t('Empty') }}</span>
  </div>
</template>

<style scoped>
.thumb {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.canvas {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  inline-size: 1000px;
  min-block-size: 625px;
  transform-origin: top left;
  background: var(--el-bg-color);
  pointer-events: none;
}

[dir='rtl'] .canvas {
  transform-origin: top right;
}

.empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
