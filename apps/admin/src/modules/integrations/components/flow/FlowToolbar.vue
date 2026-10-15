<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useFlowCanvasStore } from '../../store/flow-canvas';
import { useFlowActivityStore } from '../../store/flow-activity';

defineEmits<{ fit: []; refresh: [] }>();

const store = useFlowCanvasStore();
const { showStandalone, showMinimap, showActivity, period, standalone, problems, lastChange, busy } = storeToRefs(store);
const activity = useFlowActivityStore();
const { loading: loadingActivity } = storeToRefs(activity);
</script>

<template>
  <div class="bar" role="toolbar" :aria-label="$t('Canvas')">
    <label class="toggle">
      <el-switch v-model="showStandalone" size="small" />
      <span>{{ $t('Show unlinked ({count})', { count: standalone.size }) }}</span>
    </label>
    <label class="toggle">
      <el-switch v-model="showActivity" size="small" />
      <span>{{ $t('Activity') }}</span>
    </label>
    <template v-if="showActivity">
      <el-segmented v-model="period" size="small" :options="[{ label: $t('24h'), value: 'day' }, { label: $t('7 days'), value: 'week' }]" :aria-label="$t('Period')" />
      <el-button size="small" text :loading="loadingActivity" :aria-label="$t('Refresh activity')" @click="$emit('refresh')"><font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" /></el-button>
    </template>
    <label class="toggle">
      <el-switch v-model="showMinimap" size="small" />
      <span>{{ $t('Minimap') }}</span>
    </label>
    <span class="hint">{{ $t('Drag from one integration to another to link them.') }}</span>
    <span v-if="problems.length" class="problems" role="status">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" aria-hidden="true" />
      {{ $t('{count} events nobody listens to', { count: problems.length }) }}
    </span>
    <span v-if="busy" class="saving" role="status">{{ $t('Saving…') }}</span>
    <el-button v-else-if="lastChange" size="small" text type="primary" @click="store.undo()"><font-awesome-icon :icon="['fas', 'rotate-left']" aria-hidden="true" />&nbsp;{{ $t('Undo') }}: {{ lastChange.label }}</el-button>
    <div class="grow" />
    <el-button size="small" @click="$emit('fit')"><font-awesome-icon :icon="['fas', 'expand']" aria-hidden="true" />&nbsp;{{ $t('Fit to screen') }}</el-button>
  </div>
</template>

<style scoped lang="scss">
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  padding: 6px 2px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
  font-size: 0.86rem;
}

.problems {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-warning);
  font-size: 0.86rem;
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
}

.saving {
  color: var(--el-text-color-secondary);
  font-size: 0.86rem;
}

.grow {
  flex: 1;
}
</style>
