<template>
  <div class="provider-picker" role="radiogroup" :aria-label="$t('Storage Provider')">
    <button
      v-for="provider in STORAGE_PROVIDERS"
      :key="provider.value"
      type="button"
      role="radio"
      class="provider-option"
      :class="{ selected: model === provider.value }"
      :aria-checked="model === provider.value"
      :disabled="disabled && model !== provider.value"
      @click="!disabled && (model = provider.value)"
    >
      <img :src="provider.logo" alt="" aria-hidden="true" />
      <span class="option-text">
        <span class="option-name">{{ provider.label }}</span>
        <span class="option-hint">{{ $t(provider.hint) }}</span>
      </span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { STORAGE_PROVIDERS } from '../services/storage-providers';

const model = defineModel<string>();
defineProps<{ disabled?: boolean }>();
</script>

<style scoped lang="scss">
.provider-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.provider-option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 64px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  img {
    flex: none;
    inline-size: 32px;
    block-size: 32px;
    object-fit: contain;
  }

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.option-text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.option-name {
  font-weight: 600;
}

.option-hint {
  font-size: 12px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .provider-option {
    transition: none;
  }
}
</style>
