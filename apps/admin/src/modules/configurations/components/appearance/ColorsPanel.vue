<script lang="ts" setup>
import { computed } from 'vue';
import { COLOR_FIELDS, COLOR_GROUPS, normalizeHex, readableOn, themeChecks } from '../../services/appearance';

const palette = defineModel<Record<string, string>>({ required: true });

const groups = computed(() => COLOR_GROUPS.map((group) => ({ ...group, fields: COLOR_FIELDS.filter((field) => field.group === group.key) })));
const checks = computed(() => themeChecks(palette.value));
const failing = computed(() => checks.value.filter((check) => !check.pass));

function setColor(key: string, raw: string) {
  const hex = normalizeHex(raw);
  if (!hex) return;
  palette.value = { ...palette.value, [key]: hex };
}

function clear(key: string) {
  const next = { ...palette.value };
  delete next[key];
  palette.value = next;
}

const isValid = (key: string) => !palette.value[key] || !!normalizeHex(palette.value[key]);
const swatch = (key: string) => normalizeHex(palette.value[key] || '') || '#ffffff';

function useReadableButtonText() {
  const background = palette.value.buttonBgColor || palette.value.mainColor;
  if (background) setColor('buttonTextColor', readableOn(background));
}
</script>

<template>
  <div class="colors">
    <section v-for="group in groups" :key="group.key" class="group">
      <h3>{{ $t(group.label) }}</h3>
      <ul>
        <li v-for="field in group.fields" :key="field.key" class="field">
          <label class="swatch-label" :aria-label="$t(field.label)">
            <input type="color" class="swatch" :value="swatch(field.key)" @input="setColor(field.key, ($event.target as HTMLInputElement).value)" />
          </label>
          <div class="text">
            <label :for="`color-${field.key}`" class="name">{{ $t(field.label) }}</label>
            <span class="hint">{{ $t(field.hint) }}</span>
          </div>
          <input
            :id="`color-${field.key}`"
            class="hex"
            dir="ltr"
            spellcheck="false"
            maxlength="7"
            :placeholder="field.optional ? $t('auto') : '#000000'"
            :value="palette[field.key] || ''"
            :aria-invalid="!isValid(field.key)"
            @change="($event.target as HTMLInputElement).value ? setColor(field.key, ($event.target as HTMLInputElement).value) : clear(field.key)"
          />
          <button v-if="field.optional && palette[field.key]" type="button" class="clear" :aria-label="`${$t('Clear')}: ${$t(field.label)}`" @click="clear(field.key)">
            <font-awesome-icon :icon="['fas', 'xmark']" />
          </button>
        </li>
      </ul>
    </section>

    <section class="group checks" aria-labelledby="readability">
      <h3 id="readability">{{ $t('Readability') }}</h3>
      <p class="hint" role="status">
        <template v-if="!failing.length">{{ $t('Every checked pair meets the WCAG contrast minimum.') }}</template>
        <template v-else>{{ $t('Hard-to-read pairs: {count}. Aim for a ratio of 4.5 for text and 3 for outlines.', { count: failing.length }) }}</template>
      </p>
      <ul>
        <li v-for="check in checks" :key="check.key" class="check" :class="{ fail: !check.pass }">
          <span class="sample" :style="{ color: check.foreground, background: check.background }" aria-hidden="true">Aa</span>
          <span class="check-name">{{ $t(check.label) }}</span>
          <span class="ratio">{{ check.ratio.toFixed(1) }}:1</span>
          <font-awesome-icon :icon="['fas', check.pass ? 'circle-check' : 'triangle-exclamation']" :class="check.pass ? 'ok' : 'bad'" :aria-label="check.pass ? $t('Pass') : $t('Too low')" />
          <el-button v-if="!check.pass && check.key === 'buttons'" size="small" @click="useReadableButtonText">{{ $t('Use readable text') }}</el-button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.colors {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

h3 {
  margin: 0 0 8px;
  padding: 0;
  font-size: 0.95rem;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.swatch-label {
  flex: none;
  inline-size: 38px;
  block-size: 38px;
}

.swatch {
  inline-size: 38px;
  block-size: 38px;
  padding: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: none;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: 7px;
  }
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.name {
  font-size: 0.92rem;
  font-weight: 500;
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-align: start;
}

.hex {
  flex: none;
  inline-size: 92px;
  padding: 6px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;

  &[aria-invalid='true'] {
    border-color: var(--el-color-danger);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.clear {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 28px;
  block-size: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color);
  }
}

.checks {
  padding-block-start: 16px;
  border-block-start: 1px solid var(--el-border-color-lighter);
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 0.88rem;
}

.sample {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 38px;
  block-size: 28px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  font-weight: 700;
}

.check-name {
  flex: 1;
}

.ratio {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.ok {
  color: var(--el-color-success);
}

.bad {
  color: var(--el-color-danger);
}

.fail .ratio {
  color: var(--el-color-danger);
  font-weight: 600;
}

@media (max-width: 639px) {
  .hint {
    display: none;
  }

  .checks .hint {
    display: block;
  }
}
</style>
