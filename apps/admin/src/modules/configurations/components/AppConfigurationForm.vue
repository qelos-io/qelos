<template>
  <el-form @submit.native.prevent="save" class="app-configuration-form">
    <FormRowGroup>
      <FormInput title="Application Name" v-model="edited.name"/>
      <FormInput title="Logo URL" v-model="edited.logoUrl"/>
    </FormRowGroup>
    <LabelsInput title="Hostnames" v-model="edited.websiteUrls"/>
    <FormRowGroup>
      <FormInput title="Layout Direction" v-model="edited.direction" type="select" >
        <template #options>
          <el-option value="rtl" label="Right to Left"/>
          <el-option value="ltr" label="Left to Right"/>
        </template>
      </FormInput>
      <FormInput title="Language" v-model="edited.language" type="select">
        <template #options>
          <el-option value="ar" label="Arabic"/>
          <el-option value="bg" label="Bulgarian"/>
          <el-option value="cs" label="Czech"/>
          <el-option value="da" label="Danish"/>
          <el-option value="de" label="German"/>
          <el-option value="el" label="Greek"/>
          <el-option value="en" label="English"/>
          <el-option value="es" label="Spanish"/>
          <el-option value="fa" label="Persian"/>
          <el-option value="fi" label="Finnish"/>
          <el-option value="fr" label="French"/>
          <el-option value="he" label="Hebrew"/>
          <el-option value="hu" label="Hungarian"/>
          <el-option value="id" label="Indonesian"/>
          <el-option value="it" label="Italian"/>
          <el-option value="ja" label="Japanese"/>
          <el-option value="ko" label="Korean"/>
          <el-option value="ms" label="Malay"/>
          <el-option value="nl" label="Dutch"/>
          <el-option value="no" label="Norwegian"/>
          <el-option value="pl" label="Polish"/>
          <el-option value="pt" label="Portuguese"/>
          <el-option value="ro" label="Romanian"/>
          <el-option value="ru" label="Russian"/>
          <el-option value="sk" label="Slovak"/>
          <el-option value="sv" label="Swedish"/>
          <el-option value="th" label="Thai"/>
          <el-option value="tr" label="Turkish"/>
          <el-option value="uk" label="Ukrainian"/>
          <el-option value="vi" label="Vietnamese"/>
          <el-option value="zh" label="Chinese"/>
        </template>
      </FormInput>
    </FormRowGroup>
    <FormInput title="Home Screen" v-model="edited.homeScreen" label="Path to navigate to when user opens the app"/>
    <h3>{{ $t('Application Meta tags') }}</h3>
    <FormRowGroup>
      <FormInput title="Description" v-model="edited.description"/>
      <FormInput title="Keywords" v-model="edited.keywords"/>
      <FormInput title="Slogan" v-model="edited.slogan"/>
    </FormRowGroup>
    <h3>{{ $t('Custom Scripts and Styling') }}</h3>
    <ColorsPaletteInput v-model="edited.colorsPalette"/>
    <FormRowGroup>
      <el-form-item :title="$t('Radius')">
        <el-slider v-model="edited.borderRadius" :step="1" :min="0" :max="20" show-stops />
      </el-form-item>
      <FormInput title="Custom CSS URL" v-model="edited.themeStylesUrl" type="url" placeholder="https://.."/>
      <FormInput title="Custom JavaScript URL" v-model="edited.scriptUrl" type="url" placeholder="https://.."/>
    </FormRowGroup>
    <div class="submit-wrapper">
      <SaveButton :submitting="submitting"/>
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { IAppConfigurationMetadata } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import ColorsPaletteInput from '@/modules/configurations/components/ColorsPaletteInput.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';

const props = defineProps({
  kind: String,
  metadata: Object as () => IAppConfigurationMetadata,
  submitting: Boolean
})

const defaultMetadata: IAppConfigurationMetadata = {
  colorsPalette: undefined,
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
  websiteUrls: []
}

const edited = ref<IAppConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

function save() {
  emit('save', edited.value)
}
</script>
<style scoped>
.app-configuration-form {
  padding: 10px;
}

h3 {
  margin: 40px 0 20px;
}

.submit-wrapper {
  background-color: var(--body-bg);
  margin: 0;
  padding: 20px;
  position: sticky;
  bottom: 0;
}
</style>
