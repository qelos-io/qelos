<script setup lang="ts">
import { ref, computed } from 'vue';
import debounce from 'lodash.debounce'
import { softResetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import ColorsPaletteInput from '@/modules/configurations/components/ColorsPaletteInput.vue';
import { useLiveEditStore } from '@/modules/layouts/store/live-edit';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import configurationsService from '@/services/apis/configurations-service';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { appConfig } = useAppConfiguration();
const { changePalette } = useLiveEditStore();

// Default typography options
const fontFamilies = [
  { label: 'System UI', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
  { label: 'Inter', value: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Sora', value: "Sora, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Space Grotesk', value: "Space Grotesk, 'Segoe UI', Roboto, sans-serif" },
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans', 'Segoe UI', Roboto, sans-serif" },
  { label: 'Manrope', value: "Manrope, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Source Sans 3', value: "'Source Sans 3', 'Segoe UI', Roboto, sans-serif" },
  { label: 'Playfair Display', value: "'Playfair Display', 'Times New Roman', serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' }
];

// Default spacing options
const spacingOptions = [
  { label: t('Compact'), value: 'compact' },
  { label: t('Normal'), value: 'normal' },
  { label: t('Comfortable'), value: 'comfortable' }
];

// Default shadow options
const shadowOptions = [
  { label: t('None'), value: 'none' },
  { label: t('Light'), value: 'light' },
  { label: t('Medium'), value: 'medium' },
  { label: t('Heavy'), value: 'heavy' }
];

const layoutOptions = [
  { label: t('Classic Split'), value: 'classic', description: t('Bordered header & navigation with airy content.') },
  { label: t('Framed Main Area'), value: 'main-bordered', description: t('Minimal chrome with a bordered content canvas.') },
  { label: t('Stacked Header'), value: 'stacked-header', description: t('Full-width header above navigation and workspace.') }
];

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
  buttonTextColor: '',
  buttonBgColor: '',
  focusColor: '',
  ...appConfig.value.colorsPalette
});

// Initialize additional design properties with defaults if not set
if (!appConfig.value.fontFamily) {
  appConfig.value.fontFamily = fontFamilies[0].value;
}

if (!appConfig.value.spacing) {
  appConfig.value.spacing = 'normal';
}

if (!appConfig.value.shadowStyle) {
  appConfig.value.shadowStyle = 'light';
}

if (!appConfig.value.headingsFontFamily) {
  appConfig.value.headingsFontFamily = appConfig.value.fontFamily;
}

if (!appConfig.value.buttonRadius) {
  appConfig.value.buttonRadius = appConfig.value.borderRadius || 0;
}

if (!appConfig.value.animationSpeed) {
  appConfig.value.animationSpeed = 300; // ms
}

if (!appConfig.value.layoutStyle) {
  appConfig.value.layoutStyle = 'classic';
}

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

function selectLayoutStyle(style: string) {
  if (appConfig.value.layoutStyle === style) {
    return;
  }
  updateProperty('layoutStyle', style);
}

// Computed styles for the preview box
const previewStyles = computed(() => ({
  fontFamily: appConfig.value.fontFamily,
  borderRadius: `${appConfig.value.borderRadius}px`,
  fontSize: `${appConfig.value.baseFontSize}px`,
  padding: getSpacingValue(appConfig.value.spacing),
  boxShadow: getShadowValue(appConfig.value.shadowStyle)
}));

// Helper functions for spacing and shadow values
function getSpacingValue(spacing: string): string {
  switch (spacing) {
    case 'compact': return '8px';
    case 'comfortable': return '24px';
    default: return '16px';
  }
}

function getShadowValue(shadow: string): string {
  switch (shadow) {
    case 'none': return 'none';
    case 'light': return '0 2px 4px rgba(0, 0, 0, 0.1)';
    case 'medium': return '0 4px 8px rgba(0, 0, 0, 0.15)';
    case 'heavy': return '0 8px 16px rgba(0, 0, 0, 0.2)';
    default: return '0 2px 4px rgba(0, 0, 0, 0.1)';
  }
}
</script>

<template>
  <el-tabs type="border-card" class="design-tabs">
    <el-tab-pane :label="t('Colors')">
      <ColorsPaletteInput v-model="colors" @update:modelValue="updateColors"/>
    </el-tab-pane>
    
    <el-tab-pane :label="t('Typography')">
      <FormRowGroup>
        <div class="flex-row">
          <el-form-item :label="t('Base Font Size')" class="flex-1">
            <el-slider v-model="appConfig.baseFontSize" :step="1" :min="8" :max="28" show-stops @change="updateProperty('baseFontSize', appConfig.baseFontSize)"/>
          </el-form-item>
          <div class="font-size-demo" :style="{fontSize: appConfig.baseFontSize + 'px'}">ABC</div>
        </div>
        
        <el-form-item :label="t('Main Font Family')">
          <el-select v-model="appConfig.fontFamily" @change="updateProperty('fontFamily', appConfig.fontFamily)" style="width: 100%">
            <el-option v-for="font in fontFamilies" :key="font.value" :label="font.label" :value="font.value">
              <span :style="{fontFamily: font.value}">{{ font.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item :label="t('Headings Font Family')">
          <el-select v-model="appConfig.headingsFontFamily" @change="updateProperty('headingsFontFamily', appConfig.headingsFontFamily)" style="width: 100%">
            <el-option v-for="font in fontFamilies" :key="font.value" :label="font.label" :value="font.value">
              <span :style="{fontFamily: font.value}">{{ font.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </FormRowGroup>
    </el-tab-pane>
    
    <el-tab-pane :label="t('Layout & Elements')">
      <FormRowGroup>
        <el-form-item :label="t('Layout Style')" class="layout-style">
          <div class="layout-options">
            <button
              v-for="option in layoutOptions"
              :key="option.value"
              type="button"
              class="layout-card"
              :class="{ active: appConfig.layoutStyle === option.value }"
              @click="selectLayoutStyle(option.value)"
            >
              <div class="layout-card-header">
                <span class="layout-card-title">{{ option.label }}</span>
                <el-icon v-if="appConfig.layoutStyle === option.value">
                  <font-awesome-icon :icon="['fas', 'check-circle']"/>
                </el-icon>
              </div>
              <p class="layout-card-description">{{ option.description }}</p>
            </button>
          </div>
        </el-form-item>
      </FormRowGroup>
      <FormRowGroup>
        <div class="flex-row">
          <el-form-item :label="t('Border Radius')" class="flex-1">
            <el-slider v-model="appConfig.borderRadius" :step="1" :min="0" :max="20" show-stops @change="updateProperty('borderRadius', appConfig.borderRadius)"/>
          </el-form-item>
          <div class="border-radius-demo" :style="{borderRadius: appConfig.borderRadius + 'px'}"></div>
        </div>
        
        <div class="flex-row">
          <el-form-item :label="t('Button Radius')" class="flex-1">
            <el-slider v-model="appConfig.buttonRadius" :step="1" :min="0" :max="20" show-stops @change="updateProperty('buttonRadius', appConfig.buttonRadius)"/>
          </el-form-item>
          <div class="button-radius-demo" :style="{borderRadius: appConfig.buttonRadius + 'px'}">{{ t('Button') }}</div>
        </div>
        
        <el-form-item :label="t('Element Spacing')">
          <el-radio-group v-model="appConfig.spacing" @change="updateProperty('spacing', appConfig.spacing)">
            <el-radio-button v-for="option in spacingOptions" :key="option.value" :label="option.value">{{ option.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item :label="t('Shadow Style')">
          <el-radio-group v-model="appConfig.shadowStyle" @change="updateProperty('shadowStyle', appConfig.shadowStyle)">
            <el-radio-button v-for="option in shadowOptions" :key="option.value" :label="option.value">{{ option.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item :label="t('Animation Speed (ms)')">
          <el-slider v-model="appConfig.animationSpeed" :step="50" :min="0" :max="1000" show-stops @change="updateProperty('animationSpeed', appConfig.animationSpeed)"/>
        </el-form-item>
      </FormRowGroup>
    </el-tab-pane>
    
    <el-tab-pane :label="t('External Resources')">
      <FormRowGroup class="container">
        <FormInput v-model="appConfig.themeStylesUrl"
                   placeholder="https://.."
                   type="url"
                   :title="t('Theme CSS URL')"
                   :label="t('URL to a CSS file with custom styles')"
                   @keyup.enter="updateUrlProperty('themeStylesUrl', appConfig.themeStylesUrl)"
        />
        <FormInput v-model="appConfig.scriptUrl"
                   placeholder="https://.."
                   type="url"
                   :title="t('Javascript File URL')"
                   :label="t('URL to a Javascript file')"
                   @keyup.enter="updateUrlProperty('scriptUrl', appConfig.scriptUrl)"
        />
      </FormRowGroup>
    </el-tab-pane>
    
    <el-tab-pane :label="t('Preview')">
      <div class="preview-section">
        <div class="preview-title">{{ t('Design Preview') }}</div>
        <div class="preview-box" :style="previewStyles">
          <h2 style="margin-bottom: 16px; font-family: var(--headings-font-family);">{{ t('Sample Heading') }}</h2>
          <p style="margin-bottom: 16px;">{{ t('This is a sample paragraph showing the current design settings. You can see how fonts, colors, spacing and other design elements work together.') }}</p>
          <div class="preview-elements">
            <div class="preview-input">{{ t('Input field') }}</div>
            <div class="preview-button" :style="{borderRadius: appConfig.buttonRadius + 'px'}">{{ t('Button') }}</div>
          </div>
        </div>
      </div>
    </el-tab-pane>
  </el-tabs>
</template>

<style scoped>
.design-tabs {
  margin-bottom: 20px;
}

.border-radius-demo {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  background-color: var(--main-color-light);
  align-self: center;
  margin-block-start: 10px;
}

.button-radius-demo {
  background-color: var(--main-color, #409eff);
  color: white;
  padding: 6px 12px;
  align-self: center;
  margin-block-start: 10px;
  text-align: center;
}

.font-size-demo {
  height: 30px;
  align-self: center;
  padding: 10px;
}

.flex-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.preview-section {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.preview-title {
  padding: 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid var(--border-color);
  font-weight: bold;
}

.preview-box {
  padding: 24px;
  background-color: var(--body-bg, #fff);
  color: var(--text-color, #333);
  transition: all 0.3s;
}

.preview-elements {
  display: flex;
  gap: 12px;
  align-items: center;
}

.preview-input {
  flex: 1;
  background-color: var(--inputs-bg-color, #fff);
  color: var(--inputs-text-color, #333);
  border: 1px solid var(--border-color, #ddd);
  border-radius: var(--border-radius, 4px);
  padding: 8px 12px;
}

.preview-button {
  background-color: var(--main-color, #409eff);
  color: white;
  padding: 8px 16px;
  border-radius: var(--border-radius, 4px);
  cursor: pointer;
  transition: all 0.2s;
}

.preview-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.layout-style {
  display: flex;
  flex-direction: row;
  margin-block-start: 12px;
}

.layout-options {
  display: flex;
  gap: 12px;
}

.layout-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding-inline: 16px;
  padding-block: 14px;
  text-align: start;
  background: var(--body-bg, #fff);
  transition: border-color var(--transition-speed), box-shadow var(--transition-speed), transform 120ms ease;
  cursor: pointer;
}

.layout-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-end: 6px;
}

.layout-card-title {
  font-weight: 600;
}

.layout-card-description {
  color: var(--text-color, #333);
  font-size: 13px;
  opacity: 0.8;
  margin: 0;
}

.layout-card.active {
  border-color: var(--main-color, #409eff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
</style>