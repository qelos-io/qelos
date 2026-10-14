<script lang="ts" setup>
import { computed } from 'vue';
import { FONT_CHOICES, findFontChoice, firstFamily, type ThemeDraft } from '../../services/appearance';

const draft = defineModel<ThemeDraft>({ required: true });
const emit = defineEmits<{ font: [kind: 'fontFamily' | 'headingsFontFamily', stack: string] }>();

// a font that is not in the catalog (an old theme, or set elsewhere) still shows as an option, so it is never lost
const optionsFor = (stack: string) => {
  const known = findFontChoice(stack);
  return known ? FONT_CHOICES : [{ label: firstFamily(stack) || stack, family: stack }, ...FONT_CHOICES];
};
const selected = (stack: string) => findFontChoice(stack)?.family ?? stack;

const bodyOptions = computed(() => optionsFor(draft.value.fontFamily));
const headingOptions = computed(() => optionsFor(draft.value.headingsFontFamily));
</script>

<template>
  <div class="type">
    <div class="field">
      <label for="body-font">{{ $t('Body font') }}</label>
      <el-select id="body-font" :model-value="selected(draft.fontFamily)" @update:model-value="emit('font', 'fontFamily', $event)">
        <el-option v-for="font in bodyOptions" :key="font.family" :label="font.label" :value="font.family">
          <span :style="{ fontFamily: font.family }">{{ font.label }}</span>
        </el-option>
      </el-select>
    </div>

    <div class="field">
      <label for="heading-font">{{ $t('Headings font') }}</label>
      <el-select id="heading-font" :model-value="selected(draft.headingsFontFamily)" @update:model-value="emit('font', 'headingsFontFamily', $event)">
        <el-option v-for="font in headingOptions" :key="font.family" :label="font.label" :value="font.family">
          <span :style="{ fontFamily: font.family }">{{ font.label }}</span>
        </el-option>
      </el-select>
    </div>

    <div class="field">
      <label for="font-size">{{ $t('Base font size') }}: {{ draft.baseFontSize }}px</label>
      <el-slider id="font-size" v-model="draft.baseFontSize" :min="12" :max="22" :step="1" :aria-label="$t('Base font size')" />
    </div>

    <div class="sample" :style="{ fontFamily: draft.fontFamily, fontSize: `${draft.baseFontSize}px` }">
      <p class="sample-heading" :style="{ fontFamily: draft.headingsFontFamily }">{{ $t('The quick brown fox') }}</p>
      <p>{{ $t('Pack my box with five dozen liquor jugs. 0123456789') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.9rem;
    font-weight: 600;
  }
}

.sample {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);

  p {
    margin: 0;
    text-align: start;
  }
}

.sample-heading {
  margin-block-end: 4px !important;
  font-size: 1.5em;
  font-weight: 700;
}
</style>
