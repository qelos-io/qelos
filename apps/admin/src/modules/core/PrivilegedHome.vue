<template>
  <div class="dashboard flex-container">
    <el-tabs model-value="metadata">
      <el-tab-pane name="metadata" :label="$t('Application Metadata')">
        <div class="blocks-list">

          <StatsCard v-if="!loadingBlocks"
                     color="cyan"
                     :value="blocks.length"
                     title="Total Blocks"
                     actionText="View Blocks"
                     actionRoute="/blocks"
                     icon="box"
          />
          <StatsCard v-if="!loadingStats"
                     color="blue"
                     :value="stats.users"
                     title="Total Users"
                     actionText="View Users"
                     actionRoute="/users"
                     :fa-icon="['fas', 'users']"
          />
          <StatsCard v-if="!loadingStats"
                     :value="stats.workspaces"
                     color="purple"
                     title="Total Workspaces"
                     actionText="View Workspaces"
                     actionRoute="/admin/workspaces"
                     :fa-icon="['fas', 'briefcase']"
          />

          <BlockItem id="dashboard-common-ops">
            <template v-slot:title>
              {{ $t('Common operations') }}
            </template>

            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'app-configuration'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['fas', 'gear']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit App Settings') }}</span>
                </h4>
              </router-link>
            </div>
            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'ssr-scripts'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['fab', 'html5']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit SSR Scripts') }}</span>
                </h4>
              </router-link>
            </div>
            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'workspace-configuration'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['far', 'building']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit Workspaces Settings') }}</span>
                </h4>
              </router-link>
            </div>
            <div class="container">
              <router-link :to="{name: 'editConfiguration', params: {key: 'auth-configuration'}}">
                <h4 class="flex-row">
                  <el-icon>
                    <font-awesome-icon :icon="['fas', 'key']"/>
                  </el-icon>
                  <span class="pad-start">{{ $t('Edit Authentication Settings') }}</span>
                </h4>
              </router-link>
            </div>
          </BlockItem>
          <BlockItem>
            <template v-slot:title>
              {{ $t('Inputs UI') }}
            </template>
            <el-form class="metadata" @submit.stop.prevent>
              <p>{{ $t('Here is an input:') }}</p>
              <FormInput v-model="exampleText"/>
              <p class="relative">
                {{ $t('Change Background') }}
                <LiveEditColorOpener color="inputsBgColor"/>
              </p>
              <p class="relative">
                {{ $t('Change Text Color') }}
                <LiveEditColorOpener color="inputsTextColor"/>
              </p>
            </el-form>
          </BlockItem>
        </div>
      </el-tab-pane>
      <el-tab-pane name="colors" :label="$t('Color Palette & Design')">
        <div class="design-palettes">
          <div v-for="(p, index) in PALETTES" :key="index" @click="applyDesignPalette(p)" class="design-palette-card" :class="{ 'active': isActivePalette(p) }">
            <div class="palette-header">
              <h3>{{ p.name }}</h3>
              <p class="palette-description">{{ p.description }}</p>
            </div>
            <div class="palette-preview">
              <div class="color-swatches">
                <div v-for="color in p.colors" :key="color" class="color-swatch" :style="{backgroundColor: color}"></div>
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
        <DesignConfiguration v-if="configLoaded"/>
      </el-tab-pane>
      <el-tab-pane name="blueprints" :label="$t('Blueprints')">
        <el-button @click.prevent="$router.push({name: 'createBlueprint'})">
          <font-awesome-icon :icon="['fas', 'plus']"/>
          <span class="pad-start">{{ $t('Create Blueprint') }}</span>
        </el-button>
        <BlueprintsList/>
      </el-tab-pane>
    </el-tabs>
  </div>
<!--  <footer><QuickStartWizard/></footer>-->
</template>

<script setup lang="ts">
import { ref, toRefs, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import { PALETTES, type DesignPalette } from '@/modules/core/utils/colors-palettes';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import DesignConfiguration from '@/modules/configurations/components/DesignConfiguration.vue';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import { useUsersStats } from '@/modules/users/compositions/users-stats';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import QuickStartWizard from '@/modules/admins/components/QuickStartWizard.vue';

const { appConfig, loaded: configLoaded } = useAppConfiguration();

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList())
const { loading: loadingStats, stats } = useUsersStats()
const { t } = useI18n();
const exampleText = ref(t('Example text'));

const changePalette = useConfirmAction(async function changePalette(colorsPalette) {
  await configurationsService.update('app-configuration', {
    metadata: {
      ...appConfig.value,
      colorsPalette
    }
  })
  await resetConfiguration();
});

// Apply a complete design palette including typography, spacing, etc.
const applyDesignPalette = useConfirmAction(async function applyDesignPalette(designPalette: DesignPalette) {
  const { palette } = designPalette;
  const updatedConfig = {
    ...appConfig.value,
    colorsPalette: palette,
    borderRadius: palette.borderRadius || appConfig.value.borderRadius || 4,
    buttonRadius: palette.buttonRadius || palette.borderRadius || appConfig.value.borderRadius || 4,
    baseFontSize: palette.baseFontSize || appConfig.value.baseFontSize || 16,
    fontFamily: palette.fontFamily || appConfig.value.fontFamily,
    headingsFontFamily: palette.headingsFontFamily || palette.fontFamily || appConfig.value.fontFamily,
    spacing: palette.spacing || appConfig.value.spacing || 'normal',
    shadowStyle: palette.shadowStyle || appConfig.value.shadowStyle || 'light',
    animationSpeed: palette.animationSpeed || appConfig.value.animationSpeed || 300
  };
  
  await configurationsService.update('app-configuration', {
    metadata: updatedConfig
  });
  
  await resetConfiguration();
});

// Check if a palette is currently active
function isActivePalette(designPalette: DesignPalette): boolean {
  if (!appConfig.value.colorsPalette) return false;
  
  // Compare main color and a few other key properties to determine if this palette is active
  return appConfig.value.colorsPalette.mainColor === designPalette.palette.mainColor &&
         appConfig.value.colorsPalette.bgColor === designPalette.palette.bgColor;
}

// Generate preview styles for a palette
function getPreviewStyles(palette: DesignPalette['palette']) {
  return {
    fontFamily: palette.fontFamily || 'inherit',
    '--preview-main-color': palette.mainColor,
    '--preview-bg-color': palette.bgColor,
    '--preview-text-color': palette.textColor,
    '--preview-border-radius': `${palette.borderRadius || 4}px`,
    '--preview-button-radius': `${palette.buttonRadius || palette.borderRadius || 4}px`,
    '--preview-border-color': palette.bordersColor
  };
}
</script>
<style scoped lang="scss">
.blocks-list {
  display: flex;
  flex-wrap: wrap;
}
.dashboard {
  padding-block-end: 50px;
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
}

.palette-header h3 {
  margin: 0 0 5px;
  font-size: 16px;
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

.container {
  margin-inline: 2%;
}

@media screen and (min-width: 1200px) {
  .blocks-list {
    padding: 0 1%;
  }
}

.blocks-list i {
  font-size: var(--large-font-size);
}

.blocks-list > * {
  width: 28%;
  margin: 2%;
}

@media screen and (max-width: 1200px) {
  .blocks-list {
    flex-direction: column;

    > * {
      width: 96%;
    }
  }
}

h3 {
  padding: 10px;
  font-size: 130%;
  font-weight: normal;
}

h3 > * {
  vertical-align: middle;
}

.content {
  padding: 20px;
}

.colors-lines {
  width: 100%;
}

.palette {
  height: 50px;
  display: flex;
  flex-direction: row;
  cursor: pointer;
  border: 1px solid var(--border-color);

  > div {
    flex: 1;
  }
}

.item p {
  position: relative;
}

footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  background-color: var(--body-bg);
  padding: 10px;
  border-top: 1px solid var(--border-color);
}
</style>
