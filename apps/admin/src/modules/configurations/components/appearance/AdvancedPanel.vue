<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import { isHttpUrl, type ThemeDraft } from '../../services/appearance';

const draft = defineModel<ThemeDraft>({ required: true });
const { t } = useI18n();

const importing = ref(false);
const importText = ref('');
const importError = ref('');

async function copyTheme() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(draft.value, null, 2));
    ElMessage.success(t('Theme copied'));
  } catch {
    ElMessage.error(t('Could not copy'));
  }
}

function applyImport() {
  try {
    const parsed = JSON.parse(importText.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.colorsPalette !== 'object') throw new Error(t('This does not look like a copied theme'));
    // only known appearance keys are taken, and the draft keeps its shape
    const next = { ...draft.value };
    for (const key of Object.keys(next) as (keyof ThemeDraft)[]) {
      if (key in parsed) (next as any)[key] = parsed[key];
    }
    draft.value = next;
    importing.value = false;
    importText.value = '';
    importError.value = '';
  } catch (error: any) {
    importError.value = error.message;
  }
}
</script>

<template>
  <div class="advanced">
    <p class="intro">{{ $t('For when the settings above are not enough. Both files load on every page of the application.') }}</p>

    <div class="field">
      <label for="css-url">{{ $t('Custom CSS file') }}</label>
      <el-input id="css-url" v-model="draft.themeStylesUrl" dir="ltr" placeholder="https://.." clearable />
      <span class="hint">{{ $t('URL to a CSS file with custom styles') }}</span>
      <span v-if="!isHttpUrl(draft.themeStylesUrl)" class="error" role="alert">{{ $t('Enter a full http(s) address') }}</span>
    </div>

    <div class="field">
      <label for="js-url">{{ $t('Custom JavaScript file') }}</label>
      <el-input id="js-url" v-model="draft.scriptUrl" dir="ltr" placeholder="https://.." clearable />
      <span class="hint">{{ $t('URL to a Javascript file') }}</span>
      <span v-if="!isHttpUrl(draft.scriptUrl)" class="error" role="alert">{{ $t('Enter a full http(s) address') }}</span>
    </div>

    <div class="field">
      <span class="label">{{ $t('Move a theme between applications') }}</span>
      <div class="buttons">
        <el-button @click="copyTheme">{{ $t('Copy this theme') }}</el-button>
        <el-button @click="importing = !importing">{{ $t('Paste a theme') }}</el-button>
      </div>
      <template v-if="importing">
        <el-input v-model="importText" type="textarea" :rows="6" dir="ltr" spellcheck="false" :aria-label="$t('Theme JSON')" />
        <span v-if="importError" class="error" role="alert">{{ importError }}</span>
        <div><el-button type="primary" :disabled="!importText.trim()" @click="applyImport">{{ $t('Apply to the draft') }}</el-button></div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.advanced {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.intro {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
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
}

.error {
  color: var(--el-color-danger);
  font-size: 0.82rem;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
