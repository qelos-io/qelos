<script lang="ts" setup>
import { ref } from 'vue';
import type { IAppConfigurationMetadata } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { useConfigDraft } from '../compositions/config-shell';

const props = defineProps({
  kind: String,
  metadata: Object as () => IAppConfigurationMetadata,
  submitting: Boolean,
});

const defaultMetadata: IAppConfigurationMetadata = {
  colorsPalette: undefined as any,
  description: '',
  direction: 'ltr',
  homeScreen: '',
  keywords: '',
  language: 'en',
  logoUrl: '',
  name: '',
  scriptUrl: '',
  slogan: '',
  themeStylesUrl: '',
  borderRadius: 5,
  baseFontSize: 16,
  websiteUrls: [],
};

// the theme fields (palette, radius, font size, CSS/JS URLs) are kept in the saved object untouched: they are edited in Appearance
const edited = ref<IAppConfigurationMetadata>({ ...defaultMetadata, ...(props.metadata || {}) });
useConfigDraft(edited);

const LANGUAGES: [string, string][] = [
  ['ar', 'Arabic'], ['bg', 'Bulgarian'], ['cs', 'Czech'], ['da', 'Danish'], ['de', 'German'], ['el', 'Greek'], ['en', 'English'],
  ['es', 'Spanish'], ['fa', 'Persian'], ['fi', 'Finnish'], ['fr', 'French'], ['he', 'Hebrew'], ['hu', 'Hungarian'], ['id', 'Indonesian'],
  ['it', 'Italian'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ms', 'Malay'], ['nl', 'Dutch'], ['no', 'Norwegian'], ['pl', 'Polish'],
  ['pt', 'Portuguese'], ['ro', 'Romanian'], ['ru', 'Russian'], ['sk', 'Slovak'], ['sv', 'Swedish'], ['th', 'Thai'], ['tr', 'Turkish'],
  ['uk', 'Ukrainian'], ['vi', 'Vietnamese'], ['zh', 'Chinese'],
];

const emit = defineEmits(['save']);

function save() {
  emit('save', edited.value);
}
</script>

<template>
  <el-form class="app-form" @submit.prevent="save">
    <section class="card" aria-labelledby="app-identity">
      <h2 id="app-identity">{{ $t('Identity') }}</h2>
      <p class="hint">{{ $t('How your application introduces itself.') }}</p>
      <div class="grid">
        <FormInput title="Application Name" v-model="edited.name" />
        <FormInput title="Logo URL" v-model="edited.logoUrl" />
        <FormInput title="Small logo URL" label="shown when the navigation is collapsed" v-model="edited.smallLogoUrl" placeholder="https://.." />
      </div>
      <LabelsInput title="Hostnames" v-model="edited.websiteUrls" />
    </section>

    <section class="card" aria-labelledby="app-language">
      <h2 id="app-language">{{ $t('Language and direction') }}</h2>
      <div class="grid">
        <FormInput title="Language" v-model="edited.language" type="select">
          <template #options>
            <el-option v-for="[code, name] in LANGUAGES" :key="code" :value="code" :label="name" />
          </template>
        </FormInput>
        <FormInput title="Layout Direction" v-model="edited.direction" type="select">
          <template #options>
            <el-option value="ltr" label="Left to Right" />
            <el-option value="rtl" label="Right to Left" />
          </template>
        </FormInput>
      </div>
      <FormInput title="Home Screen" v-model="edited.homeScreen" label="Path to navigate to when user opens the app" />
    </section>

    <section class="card" aria-labelledby="app-meta">
      <h2 id="app-meta">{{ $t('Application Meta tags') }}</h2>
      <p class="hint">{{ $t('Used for the browser title, search engines and link previews.') }}</p>
      <FormInput title="Slogan" v-model="edited.slogan" />
      <FormInput title="Description" v-model="edited.description" />
      <FormInput title="Keywords" v-model="edited.keywords" />
    </section>

    <aside class="card appearance-link">
      <div>
        <h2>{{ $t('Looks and styling') }}</h2>
        <p class="hint">{{ $t('Colors, typography, layout and custom CSS or JavaScript are edited in Appearance, with a live preview.') }}</p>
      </div>
      <el-button @click="$router.push({ name: 'appearance' })">{{ $t('Open Appearance') }}</el-button>
    </aside>
  </el-form>
</template>

<style scoped lang="scss">
.app-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
}

.card {
  padding: 18px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.05rem;
  }
}

.hint {
  margin: 4px 0 14px;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0 16px;
}

.appearance-link {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .hint {
    margin-block-end: 0;
  }
}

@media (max-width: 1100px) {
  .app-form {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .appearance-link {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
