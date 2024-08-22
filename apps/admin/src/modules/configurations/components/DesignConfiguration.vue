<script setup lang="ts">
import { ref } from 'vue';
import debounce from 'lodash.debounce'
import { softResetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import ColorsPaletteInput from '@/modules/configurations/components/ColorsPaletteInput.vue';
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import configurationsService from '@/services/configurations-service';

const { appConfig } = useAppConfiguration();

const { changePalette } = useLiveEditStore();

const colors = ref({
  mainColor: '',
  mainColorLight: appConfig.value.colorsPalette?.mainColor || '',
  textColor: '',
  secondaryColor: '',
  thirdColor: '',
  bgColor: '',
  bordersColor: '',
  linksColor: '',
  navigationBgColor: '',
  negativeColor: '',
  inputsTextColor: '',
  inputsBgColor: '',
  ...appConfig.value.colorsPalette
});

const updateColors = debounce(changePalette, 660);

async function updateUrlProperty(key: string, url: string) {
  if (url.trim() === '' || url.startsWith('http')) {
    appConfig.value[key] = url.trim();
    await configurationsService.update('app-configuration', {
      metadata: {
        ...appConfig.value,
      }
    })
    await softResetConfiguration();
  }
}
</script>

<template>
  <div>
    <ColorsPaletteInput v-model="colors" @update:modelValue="updateColors"/>
  </div>
  <div class="container">
    <FormInput v-model="appConfig.themeStylesUrl"
               placeholder="https://.."
               type="url"
               :title="$t('Theme CSS URL')"
               :label="$t('URL to a CSS file with custom styles')"
               @keyup.enter="updateUrlProperty('themeStylesUrl', appConfig.themeStylesUrl)"
    />
    <FormInput v-model="appConfig.scriptUrl"
               placeholder="https://.."
               type="url"
               :title="$t('Javascript File URL')"
               :label="$t('URL to a Javascript file')"
               @keyup.enter="updateUrlProperty('scriptUrl', appConfig.scriptUrl)"
    />
  </div>
</template>

<style scoped>

</style>