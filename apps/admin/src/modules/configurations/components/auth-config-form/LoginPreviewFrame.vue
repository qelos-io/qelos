<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { IAuthConfigurationMetadata } from '@qelos/global-types';
import Login from '@/modules/core/Login.vue';

const props = defineProps<{
  config: IAuthConfigurationMetadata;
  device: 'desktop' | 'phone';
}>();

// the login is rendered at a real device width and scaled down to the frame,
// so its container-query layout (split / stacked / banner) is exactly what visitors get
const WIDTHS = { desktop: 1120, phone: 390 } as const;
const HEIGHTS = { desktop: 700, phone: 780 } as const;

const outer = ref<HTMLElement>();
const available = ref(0);
let observer: ResizeObserver | undefined;

onMounted(() => {
  if (!outer.value) return;
  available.value = outer.value.clientWidth;
  observer = new ResizeObserver(([entry]) => (available.value = entry.contentRect.width));
  observer.observe(outer.value);
});
onBeforeUnmount(() => observer?.disconnect());

const virtualWidth = computed(() => WIDTHS[props.device]);
const virtualHeight = computed(() => HEIGHTS[props.device]);
const scale = computed(() => (available.value ? Math.min(1, available.value / virtualWidth.value) : 1));
const frameWidth = computed(() => virtualWidth.value * scale.value);
</script>

<template>
  <div ref="outer" class="outer">
    <div class="device" :class="device" :style="{ inlineSize: `${frameWidth}px`, blockSize: `${virtualHeight * scale}px` }">
      <div class="stage" :style="{ inlineSize: `${virtualWidth}px`, blockSize: `${virtualHeight}px`, transform: `scale(${scale})` }">
        <Login :auth-config="config" preview />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.outer {
  display: flex;
  justify-content: center;
  inline-size: 100%;
}

.device {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--body-bg);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);

  &.phone {
    border-radius: 22px;
  }
}

.stage {
  transform-origin: top left;
}

[dir='rtl'] .stage {
  transform-origin: top right;
}
</style>
