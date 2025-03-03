<script setup lang="ts">
import { ref } from 'vue';
import debounce from 'lodash.debounce'
import { softResetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import ColorsPaletteInput from '@/modules/configurations/components/ColorsPaletteInput.vue';
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import configurationsService from '@/services/configurations-service';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';

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
    await updateProperty(key, url.trim())
  }
}

async function updateProperty(key: string, value: string | number) {
  appConfig.value[key] = value;
  await configurationsService.update('app-configuration', {
    metadata: {
      ...appConfig.value,
    }
  })
  await softResetConfiguration();
}
</script>

<template>
  <div>
    <ColorsPaletteInput v-model="colors" @update:modelValue="updateColors"/>
  </div>
  <FormRowGroup>
    <div class="flex-row">
      <el-form-item :label="$t('Border Radius')" class="flex-1">
        <el-slider v-model="appConfig.borderRadius" :step="1" :min="0" :max="20" show-stops @change="updateProperty('borderRadius', appConfig.borderRadius)"/>
      </el-form-item>
      <div class="border-radius-demo" :style="{borderRadius: appConfig.borderRadius + 'px'}"></div>
    </div>
    <div class="flex-row">
      <el-form-item :label="$t('Base Font Size')" class="flex-1">
        <el-slider v-model="appConfig.baseFontSize" :step="1" :min="8" :max="28" show-stops @change="updateProperty('baseFontSize', appConfig.baseFontSize)"/>
      </el-form-item>
      <div class="font-size-demo" :style="{fontSize: appConfig.baseFontSize + 'px'}">ABC</div>
    </div>
  </FormRowGroup>
  <FormRowGroup class="container">
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
  </FormRowGroup>
</template>

<style scoped>

.border-radius-demo {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  background-color: var(--main-color-light);
  align-self: center;
  margin-block-start: 10px;
}

.font-size-demo {
  height: 30px;
  align-self: center;
  padding: 10px;
}
</style>