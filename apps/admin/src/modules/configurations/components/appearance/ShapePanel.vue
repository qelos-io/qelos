<script lang="ts" setup>
import type { ThemeDraft } from '../../services/appearance';

const draft = defineModel<ThemeDraft>({ required: true });

const spacing = [
  { label: 'Compact', value: 'compact' },
  { label: 'Normal', value: 'normal' },
  { label: 'Comfortable', value: 'comfortable' },
];
const shadows = [
  { label: 'None', value: 'none' },
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Heavy', value: 'heavy' },
];
</script>

<template>
  <div class="shape">
    <div class="field">
      <label for="radius">{{ $t('Corner radius') }}: {{ draft.borderRadius }}px</label>
      <el-slider id="radius" v-model="draft.borderRadius" :min="0" :max="24" :aria-label="$t('Corner radius')" />
      <span class="hint">{{ $t('Cards, inputs and panels') }}</span>
    </div>

    <div class="field">
      <label for="button-radius">{{ $t('Button radius') }}: {{ draft.buttonRadius }}px</label>
      <el-slider id="button-radius" v-model="draft.buttonRadius" :min="0" :max="24" :aria-label="$t('Button radius')" />
    </div>

    <div class="field">
      <span class="label">{{ $t('Spacing') }}</span>
      <el-segmented v-model="draft.spacing" :options="spacing.map((option) => ({ ...option, label: $t(option.label) }))" :aria-label="$t('Spacing')" />
      <span class="hint">{{ $t('The gap between panels and elements') }}</span>
    </div>

    <div class="field">
      <span class="label">{{ $t('Shadows') }}</span>
      <el-segmented v-model="draft.shadowStyle" :options="shadows.map((option) => ({ ...option, label: $t(option.label) }))" :aria-label="$t('Shadows')" />
    </div>

    <div class="field">
      <label for="speed">{{ $t('Animation speed') }}: {{ draft.animationSpeed }}ms</label>
      <el-slider id="speed" v-model="draft.animationSpeed" :min="0" :max="600" :step="50" :aria-label="$t('Animation speed')" />
      <span class="hint">{{ $t('0 turns transitions off') }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shape {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label,
  .label {
    font-size: 0.9rem;
    font-weight: 600;
  }
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-align: start;
}
</style>
