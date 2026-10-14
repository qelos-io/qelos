<script lang="ts" setup>
import { ref } from 'vue';
import { isHttpUrl, type ThemeDraft } from '../../services/appearance';

const draft = defineModel<ThemeDraft>({ required: true });

const failed = ref<Record<string, boolean>>({});
</script>

<template>
  <div class="brand">
    <p class="intro">{{ $t('Your logo appears in the navigation and in the header. The application name lives in App Settings.') }}</p>

    <div class="field">
      <label for="logo">{{ $t('Logo URL') }}</label>
      <el-input id="logo" v-model="draft.logoUrl" dir="ltr" placeholder="https://.." clearable @input="failed.logo = false" />
      <span v-if="!isHttpUrl(draft.logoUrl)" class="error" role="alert">{{ $t('Enter a full http(s) address') }}</span>
      <div v-if="draft.logoUrl" class="preview">
        <img v-if="!failed.logo" :src="draft.logoUrl" :alt="$t('Logo preview')" @error="failed.logo = true" />
        <span v-else class="error">{{ $t('This image could not be loaded') }}</span>
      </div>
    </div>

    <div class="field">
      <label for="small-logo">{{ $t('Small logo URL') }}</label>
      <el-input id="small-logo" v-model="draft.smallLogoUrl" dir="ltr" placeholder="https://.." clearable @input="failed.small = false" />
      <span class="hint">{{ $t('Shown when the navigation is collapsed or narrow. A square image works best.') }}</span>
      <span v-if="!isHttpUrl(draft.smallLogoUrl)" class="error" role="alert">{{ $t('Enter a full http(s) address') }}</span>
      <div v-if="draft.smallLogoUrl" class="preview square">
        <img v-if="!failed.small" :src="draft.smallLogoUrl" :alt="$t('Small logo preview')" @error="failed.small = true" />
        <span v-else class="error">{{ $t('This image could not be loaded') }}</span>
      </div>
    </div>

    <router-link :to="{ name: 'editConfiguration', params: { key: 'app-configuration' } }" class="link">{{ $t('Edit the application name and meta tags') }}</router-link>
  </div>
</template>

<style scoped lang="scss">
.brand {
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

  label {
    font-size: 0.9rem;
    font-weight: 600;
  }
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-align: start;
}

.error {
  color: var(--el-color-danger);
  font-size: 0.82rem;
}

.preview {
  display: grid;
  place-items: center;
  min-block-size: 70px;
  padding: 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);

  img {
    max-inline-size: 220px;
    max-block-size: 64px;
    object-fit: contain;
  }

  &.square img {
    max-inline-size: 48px;
  }
}

.link {
  color: var(--el-color-primary);
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
