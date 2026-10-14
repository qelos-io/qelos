<script lang="ts" setup>
import type { ThemeDraft } from '../../services/appearance';

const draft = defineModel<ThemeDraft>({ required: true });

const layouts = [
  { value: 'classic', label: 'Classic split', description: 'Floating header and navigation with an airy content area.' },
  { value: 'main-bordered', label: 'Framed main area', description: 'Minimal chrome with a bordered content canvas.' },
  { value: 'stacked-header', label: 'Stacked header', description: 'A full-width header above the navigation and workspace.' },
] as const;

const navigation = [
  { value: 'icon-text', label: 'Icon and text', description: 'Icons next to their labels.' },
  { value: 'icon-above', label: 'Icon above text', description: 'Icons over small labels.' },
  { value: 'icons-only', label: 'Icons only', description: 'Narrow, with tooltips.' },
  { value: 'text-only', label: 'Text only', description: 'Labels without icons.' },
  { value: 'compact', label: 'Compact', description: 'Smaller rows for long menus.' },
] as const;
</script>

<template>
  <div class="layout">
    <fieldset>
      <legend>{{ $t('Page layout') }}</legend>
      <div class="options">
        <label v-for="option in layouts" :key="option.value" class="option" :class="{ active: draft.layoutStyle === option.value }">
          <input v-model="draft.layoutStyle" type="radio" name="layout-style" :value="option.value" class="sr-only" />
          <span class="drawing" :class="`l-${option.value}`" aria-hidden="true"><i class="d-nav" /><i class="d-head" /><i class="d-main" /></span>
          <span class="label">{{ $t(option.label) }}</span>
          <span class="desc">{{ $t(option.description) }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>{{ $t('Navigation') }}</legend>
      <div class="options">
        <label v-for="option in navigation" :key="option.value" class="option" :class="{ active: draft.navigationLayout === option.value }">
          <input v-model="draft.navigationLayout" type="radio" name="nav-layout" :value="option.value" class="sr-only" />
          <span class="drawing nav-drawing" :class="`n-${option.value}`" aria-hidden="true"><i /><i /><i /></span>
          <span class="label">{{ $t(option.label) }}</span>
          <span class="desc">{{ $t(option.description) }}</span>
        </label>
      </div>
    </fieldset>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

fieldset {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-block-end: 8px;
  padding: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &:has(:focus-visible) {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.label {
  font-size: 0.88rem;
  font-weight: 600;
}

.desc {
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: start;
}

.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

// small wireframes: nav = filled block, head = bar, main = outline
.drawing {
  position: relative;
  display: block;
  block-size: 64px;
  border-radius: 6px;
  background: var(--el-fill-color);
  overflow: hidden;

  i {
    position: absolute;
    display: block;
    border-radius: 3px;
  }

  .d-nav {
    inset-block: 6px;
    inset-inline-start: 6px;
    inline-size: 20%;
    background: var(--el-text-color-secondary);
  }

  .d-head {
    inset-block-start: 6px;
    inset-inline: calc(20% + 12px) 6px;
    block-size: 10px;
    background: var(--el-border-color);
  }

  .d-main {
    inset-block: 22px 6px;
    inset-inline: calc(20% + 12px) 6px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
  }

  &.l-main-bordered .d-main {
    border-color: var(--el-text-color-secondary);
    border-width: 2px;
  }

  &.l-main-bordered .d-head {
    background: transparent;
  }

  &.l-stacked-header {
    .d-head {
      inset-block-start: 0;
      inset-inline: 0;
      block-size: 12px;
      border-radius: 0;
      background: var(--el-text-color-secondary);
    }

    .d-nav {
      inset-block-start: 18px;
    }

    .d-main {
      inset-block-start: 18px;
    }
  }
}

.nav-drawing {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 8px;

  i {
    position: static;
    block-size: 8px;
    background: var(--el-text-color-secondary);
    opacity: 0.8;
  }

  &.n-icons-only i {
    inline-size: 10px;
    margin-inline: auto;
  }

  &.n-icon-above i {
    inline-size: 60%;
    margin-inline: auto;
    block-size: 10px;
  }

  &.n-text-only i {
    inline-size: 70%;
    block-size: 5px;
  }

  &.n-compact i {
    inline-size: 80%;
    block-size: 5px;
  }

  &.n-icon-text i {
    inline-size: 85%;
  }
}
</style>
