<script lang="ts" setup>
import { PALETTES, type DesignPalette } from '../../../core/utils/colors-palettes';
import { isColorDark } from '../../../core/services/theme';

const props = defineProps<{ currentMain?: string; currentBg?: string }>();
const emit = defineEmits<{ pick: [palette: DesignPalette['palette']] }>();

const isDark = (color: string) => isColorDark(color);
const isActive = (preset: DesignPalette) => preset.palette.mainColor === props.currentMain && preset.palette.bgColor === props.currentBg;
</script>

<template>
  <section class="presets" :aria-label="$t('Start from a preset')">
    <h2>{{ $t('Start from a preset') }}</h2>
    <ul>
      <li v-for="preset in PALETTES" :key="preset.name">
        <button type="button" class="preset" :class="{ active: isActive(preset) }" :aria-pressed="isActive(preset)" @click="emit('pick', preset.palette)">
          <span class="mini" :style="{ background: preset.palette.bgColor, borderColor: preset.palette.bordersColor }" aria-hidden="true">
            <i class="mini-nav" :style="{ background: preset.palette.navigationBgColor }" />
            <i class="mini-card" :style="{ background: preset.palette.surfaceColor || (preset.palette.negativeColor && isDark(preset.palette.bgColor) ? preset.palette.negativeColor : '#fff') }" />
            <i class="mini-btn" :style="{ background: preset.palette.buttonBgColor || preset.palette.mainColor }" />
          </span>
          <span class="name">{{ preset.name }}</span>
        </button>
      </li>
    </ul>
    <p class="note">{{ $t('A preset changes colors, fonts and shape in the draft. Your logos and layout stay as they are. Nothing is saved until you publish.') }}</p>
  </section>
</template>

<style scoped lang="scss">
.presets {
  display: flex;
  flex-direction: column;
  gap: 8px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1rem;
  }
}

ul {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 2px 2px 8px;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.preset {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 6px;
  inline-size: 132px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--surface);
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }
}

.mini {
  position: relative;
  display: block;
  block-size: 62px;
  border: 1px solid;
  border-radius: 6px;
  overflow: hidden;

  i {
    position: absolute;
    display: block;
    border-radius: 3px;
  }
}

.mini-nav {
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 22%;
  border-radius: 0 !important;
}

.mini-card {
  inset-block: 8px 20px;
  inset-inline: 30% 8px;
  border: 1px solid rgb(0 0 0 / 0.08);
}

.mini-btn {
  inset-block-end: 6px;
  inset-inline-start: 30%;
  inline-size: 26%;
  block-size: 8px;
}

.name {
  overflow: hidden;
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-align: start;
}
</style>
