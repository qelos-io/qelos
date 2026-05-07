<template>
  <div class="appearance-settings">
    <header class="appearance-header">
      <h1>{{ $t('Appearance') }}</h1>
      <p class="appearance-lead">
        {{ $t('Themes, colors, and typography for your application UI.') }}
        <router-link :to="{ name: 'editConfiguration', params: { key: 'app-configuration' } }" class="inline-link">
          {{ $t('Application name, logos, and branding') }}
        </router-link>
      </p>
    </header>

    <div class="design-palettes">
      <div
        v-for="(p, index) in PALETTES"
        :key="index"
        class="design-palette-card"
        :class="{ active: isActivePalette(p) }"
        @click="applyDesignPalette(p)"
      >
        <div class="palette-header">
          <h3>{{ p.name }}</h3>
          <p class="palette-description">{{ p.description }}</p>
        </div>
        <div class="palette-preview">
          <div class="color-swatches">
            <div v-for="color in p.colors" :key="color" class="color-swatch" :style="{ backgroundColor: color }" />
          </div>
          <div class="design-preview" :style="getPreviewStyles(p.palette)">
            <div class="preview-header">Header</div>
            <div class="preview-content">
              <div class="preview-text">Text Sample</div>
              <div class="preview-button">Button</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DesignConfiguration v-if="configLoaded" />
  </div>
</template>

<script setup lang="ts">
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/apis/configurations-service';
import { DesignPalette, PALETTES } from '@/modules/core/utils/colors-palettes';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import DesignConfiguration from '@/modules/configurations/components/DesignConfiguration.vue';

const { appConfig, loaded: configLoaded } = useAppConfiguration();

const applyDesignPalette = useConfirmAction(async function applyDesignPalette(designPalette: DesignPalette) {
  const { palette } = designPalette;
  const updatedConfig = {
    ...appConfig.value,
    colorsPalette: palette,
    borderRadius: palette.borderRadius || appConfig.value.borderRadius || 0,
    buttonRadius: palette.buttonRadius || palette.borderRadius || appConfig.value.borderRadius || 4,
    baseFontSize: palette.baseFontSize || appConfig.value.baseFontSize || 16,
    fontFamily: palette.fontFamily || appConfig.value.fontFamily,
    headingsFontFamily: palette.headingsFontFamily || palette.fontFamily || appConfig.value.fontFamily,
    spacing: palette.spacing || appConfig.value.spacing || 'normal',
    shadowStyle: palette.shadowStyle || appConfig.value.shadowStyle || 'light',
    animationSpeed: palette.animationSpeed || appConfig.value.animationSpeed || 300,
  };

  await configurationsService.update('app-configuration', {
    metadata: updatedConfig,
  });

  await resetConfiguration();
});

function isActivePalette(designPalette: DesignPalette): boolean {
  if (!appConfig.value.colorsPalette) return false;
  return (
    appConfig.value.colorsPalette.mainColor === designPalette.palette.mainColor &&
    appConfig.value.colorsPalette.bgColor === designPalette.palette.bgColor
  );
}

function getPreviewStyles(palette: DesignPalette['palette']) {
  return {
    fontFamily: palette.fontFamily || 'inherit',
    '--preview-main-color': palette.mainColor,
    '--preview-bg-color': palette.bgColor,
    '--preview-text-color': palette.textColor,
    '--preview-border-radius': `${palette.borderRadius || 0}px`,
    '--preview-button-radius': `${palette.buttonRadius || palette.borderRadius || 4}px`,
    '--preview-border-color': palette.bordersColor,
  };
}
</script>

<style scoped lang="scss">
.appearance-settings {
  padding: 20px 24px 40px;
  max-width: 1200px;
  margin-inline: auto;
}

.appearance-header {
  margin-bottom: 28px;

  h1 {
    margin: 0 0 8px;
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c3e50;
  }
}

.appearance-lead {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.inline-link {
  color: var(--main-color);
  font-weight: 500;
  margin-inline-start: 4px;
}

.design-palettes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.design-palette-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.design-palette-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.design-palette-card.active {
  border: 2px solid var(--main-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.palette-header {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);

  h3 {
    margin: 0 0 5px;
    font-size: 16px;
    color: black;
  }
}

.palette-description {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.palette-preview {
  padding: 15px;
}

.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.design-preview {
  border: 1px solid var(--preview-border-color, #ddd);
  border-radius: var(--preview-border-radius, 4px);
  overflow: hidden;
  height: 120px;
  background-color: var(--preview-bg-color, #fff);
  color: var(--preview-text-color, #333);
}

.preview-header {
  background-color: var(--preview-main-color, #409eff);
  color: #fff;
  padding: 8px 12px;
  font-size: 14px;
}

.preview-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-text {
  font-size: 13px;
}

.preview-button {
  background-color: var(--preview-main-color, #409eff);
  color: #fff;
  border-radius: var(--preview-button-radius, 4px);
  padding: 6px 12px;
  font-size: 13px;
  display: inline-block;
  text-align: center;
  width: fit-content;
}

@media (max-width: 768px) {
  .design-palettes {
    grid-template-columns: 1fr;
  }
}
</style>
