<template>
  <div id="app">
    <router-view v-if="isAppReady"/>
  </div>
</template>
<script lang="ts" setup>
import { useAppConfiguration } from './modules/configurations/store/app-configuration'
import { computed, getCurrentInstance, provide, ref, watch } from 'vue'
import { translate, loadLanguageAsync } from './plugins/i18n'
import { usePluginsInjectables } from '@/modules/plugins/store/plugins-injectables';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { usePluginsStore } from './modules/plugins/store/pluginsStore';
import { usePubSubNotifications } from './modules/core/compositions/pubsub-notifications';
import { useUsersHeader } from './modules/configurations/store/users-header';

// Color parsing constants
const HEX_COLOR_SHORT_LENGTH = 3;
const HEX_COLOR_FULL_LENGTH = 6;
const HEX_RADIX = 16;
const RGB_MAX_VALUE = 255;
const DARK_THRESHOLD = 0.5;

// Default design constants
const DEFAULT_BORDER_RADIUS = 5;
const DEFAULT_BASE_FONT_SIZE = 16;
const DEFAULT_ANIMATION_SPEED = 300;
const SPACING_COMPACT = '4px';
const SPACING_COMPACT_CONTENT = '8px';
const SPACING_COMFORTABLE = '12px';
const SPACING_COMFORTABLE_CONTENT = '24px';
const SPACING_DEFAULT = '8px';
const SPACING_DEFAULT_CONTENT = '16px';

// Function to determine if a color is dark (for applying appropriate text colors)
function isColorDark(hexColor: string): boolean {
  // Default to false if invalid color
  if (!hexColor || typeof hexColor !== 'string') return false;
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  let r, g, b;
  if (hexColor.length === HEX_COLOR_SHORT_LENGTH) {
    // For shorthand hex colors like #ABC
    r = parseInt(hexColor.charAt(0) + hexColor.charAt(0), HEX_RADIX);
    g = parseInt(hexColor.charAt(1) + hexColor.charAt(1), HEX_RADIX);
    b = parseInt(hexColor.charAt(2) + hexColor.charAt(2), HEX_RADIX);
  } else if (hexColor.length === HEX_COLOR_FULL_LENGTH) {
    // For full hex colors like #AABBCC
    r = parseInt(hexColor.substring(0, 2), HEX_RADIX);
    g = parseInt(hexColor.substring(2, 4), HEX_RADIX);
    b = parseInt(hexColor.substring(4, 6), HEX_RADIX);
  } else {
    // Invalid hex color
    return false;
  }
  
  // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
  // This formula considers human perception of color brightness
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / RGB_MAX_VALUE;
  
  // Return true if the color is dark (brightness < DARK_THRESHOLD)
  return brightness < DARK_THRESHOLD;
}

const { appConfig, loaded } = useAppConfiguration()
const vm = getCurrentInstance();
useUsersHeader()

usePluginsMicroFrontends();
usePluginsInjectables();
const pluginsStore = usePluginsStore(); 

const isAppReady = computed(() => loaded.value && pluginsStore.injectablesLoaded);

watch(() => appConfig.value.language, async (language) => {
  await loadLanguageAsync(language)
  document.dir = translate('appDirection')
})

watch(() => {
  const cssUrl = appConfig.value.themeStylesUrl;
  const palette = appConfig.value.colorsPalette;
  const borderRadius = appConfig.value.borderRadius || (palette?.borderRadius) || 0;
  const baseFontSize = appConfig.value.baseFontSize || palette?.baseFontSize || DEFAULT_BASE_FONT_SIZE;
  const fontFamily = appConfig.value.fontFamily || palette?.fontFamily || 'Arial, sans-serif';
  const headingsFontFamily = appConfig.value.headingsFontFamily || palette?.headingsFontFamily || 'Arial, sans-serif';
  const buttonRadius = appConfig.value.buttonRadius || palette?.buttonRadius || 0;
  const spacing = appConfig.value.spacing || palette?.spacing || '10px';
  const shadowStyle = appConfig.value.shadowStyle || palette?.shadowStyle || 'md';
  const animationSpeed = appConfig.value.animationSpeed || palette?.animationSpeed || 'normal';
  return {
    cssUrl,
    palette,
    borderRadius,
    baseFontSize,
    fontFamily,
    headingsFontFamily,
    buttonRadius,
    spacing,
    shadowStyle,
    animationSpeed
  }
}, ({ cssUrl, palette, borderRadius, baseFontSize, fontFamily, headingsFontFamily, buttonRadius, spacing, shadowStyle, animationSpeed }) => {
  let appStyle = document.querySelector('#app-style');
  if (!appStyle) {
    appStyle = document.createElement('style');
    appStyle.setAttribute('id', 'app-style');
    document.body.prepend(appStyle);
  }
  const importCss = cssUrl ? `@import "${cssUrl}";` : '';
  palette = palette || {};

  // Determine if this is a dark theme based on background color brightness
  const isDarkTheme = palette?.bgColor ? isColorDark(palette.bgColor) : false;

  vm.appContext.config.globalProperties.$isDarkTheme = isDarkTheme;
  
  if (isDarkTheme) {
    document.documentElement.setAttribute('data-dark-mode', 'true');
  } else {
    document.documentElement.removeAttribute('data-dark-mode');
  }

  appStyle.innerHTML = `
    ${importCss}
    :root {
      /* Base design variables */
      --border-radius: ${typeof borderRadius === 'number' ? borderRadius : DEFAULT_BORDER_RADIUS}px;
      --base-font-size: ${typeof baseFontSize === 'number' && baseFontSize > 0 ? baseFontSize : DEFAULT_BASE_FONT_SIZE}px;
      --button-radius: ${typeof buttonRadius === 'number' ? buttonRadius : borderRadius || 0}px;
      
      /* Typography */
      --font-family: ${fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'};
      --headings-font-family: ${headingsFontFamily || fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'};
      
      /* Spacing and layout */
      --spacing: ${spacing?.includes('px') ? spacing : spacing === 'compact' ? SPACING_COMPACT : spacing === 'comfortable' ? SPACING_COMFORTABLE : SPACING_DEFAULT};
      --content-spacing: ${spacing?.includes('px') ? spacing : spacing === 'compact' ? SPACING_COMPACT_CONTENT : spacing === 'comfortable' ? SPACING_COMFORTABLE_CONTENT : SPACING_DEFAULT_CONTENT};
      --element-spacing: var(--spacing);
      
      /* Animation */
      --transition-speed: ${typeof animationSpeed === 'number' ? animationSpeed : DEFAULT_ANIMATION_SPEED}ms;
      
      /* Shadows */
      --box-shadow: ${shadowStyle === 'none' ? 'none' : 
                       shadowStyle === 'light' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 
                       shadowStyle === 'medium' ? '0 4px 8px rgba(0, 0, 0, 0.15)' : 
                       shadowStyle === 'heavy' ? '0 8px 16px rgba(0, 0, 0, 0.2)' : 
                       '0 2px 4px rgba(0, 0, 0, 0.1)'};
      
      /* Colors */
      ${palette.bgColor ? `--body-bg: ${palette.bgColor};` : ''}
      ${palette.mainColor ? `--main-color: ${palette.mainColor};` : ''}
      ${palette.mainColorLight ? `--main-color-light: ${palette.mainColorLight};` : ''}
      ${palette.textColor ? `--text-color: ${palette.textColor};` : ''}
      ${palette.secondaryColor ? `--secondary-color: ${palette.secondaryColor};` : ''}
      ${palette.thirdColor ? `--third-color: ${palette.thirdColor};` : '--third-color: #c6dccc;'}
      ${palette.linksColor ? `--link: ${palette.linksColor};` : ''}
      ${palette.bordersColor ? `--border-color: ${palette.bordersColor};` : ''}
      ${palette.inputsTextColor ? `--inputs-text-color: ${palette.inputsTextColor};` : ''}
      ${palette.inputsBgColor ? `--inputs-bg-color: ${palette.inputsBgColor};` : ''}
      ${palette.navigationBgColor ? `--nav-bg-color: ${palette.navigationBgColor};` : ''}
      ${palette.negativeColor ? `--negative-color: ${palette.negativeColor};` : '--negative-color: #254044;'}
      
      /* New color variables */
      ${palette.buttonTextColor ? `--button-text-color: ${palette.buttonTextColor};` : '--button-text-color: #ffffff;'}
      ${palette.buttonBgColor ? `--button-bg-color: ${palette.buttonBgColor};` : palette.mainColor ? `--button-bg-color: ${palette.mainColor};` : '--button-bg-color: #409eff;'}
      ${palette.focusColor ? `--focus-color: ${palette.focusColor};` : palette.mainColor ? `--focus-color: ${palette.mainColor};` : '--focus-color: #409eff;'}
    }
    
    /* Element Plus component overrides for dark themes */
    ${isDarkTheme ? `
      /* Tab styles for dark themes */
      .el-tabs__nav-scroll {
        background-color: var(--secondary-color);
      }
      .el-tabs .el-tabs__header .el-tabs__item {
        background-color: var(--secondary-color);
        color: rgba(255, 255, 255, 0.8);
      }
      .el-tabs__active-bar {
        background-color: ${palette.mainColor || '#8b5cf6'} !important;
      }
      .el-tabs__nav-wrap::after {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Form elements */
      .el-form-item__label {
        color: rgba(255, 255, 255, 0.8);
      }
      
      /* Card styles */
      .el-card {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: var(--main-color);
      }
      .el-card .el-card__header, .el-card h3, .el-card .el-card__body, .el-card .el-card__body > :is(label, p, div), .el-card .el-card__body .el-form-item__label {
        color: var(--main-color);
      }
      
      /* Button styles */
      .el-button--default {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: rgba(255, 255, 255, 0.8) !important;
      }
      
      /* Input styles */
      .el-input__inner {
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: var(--negative-color);
      }
      
      /* Select styles */
      .el-select-dropdown {
        background-color: var(--negative-color);
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-select-dropdown__item.hover, .el-select-dropdown__item:hover {
        background-color: var(--negative-color);
      }
      .el-select-dropdown__list li {
        color: var(--main-color);
      }
      
      /* Dialog styles */
      .el-dialog {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-dialog__title {
        color: ${palette.textColor || '#ffffff'} !important;
      }
      
      /* Table styles */
      .el-table {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
        color: ${palette.textColor || '#ffffff'} !important;
      }
      .el-table th, .el-table tr {
        background-color: ${palette.bgColor || '#1e1e1e'} !important;
      }
      .el-table--border, .el-table--group, .el-table td, .el-table th.is-leaf {
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Dropdown styles */
      .el-dropdown-menu {
        background-color: ${palette.navigationBgColor || '#2d2d2d'} !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      .el-dropdown-menu__item {
        color: var(--negative-color);
      }
      .el-dropdown-menu__item:hover {
        background-color: var(--secondary-color);
      }
    ` : ''}
  `;
})

watch(() => appConfig.value.scriptUrl, () => {
  if (!appConfig.value.scriptUrl) {
    return;
  }
  const script = document.createElement('script');
  script.setAttribute('src', appConfig.value.scriptUrl);
  document.head.appendChild(script);
})

usePubSubNotifications();

provide('editableManager', ref(false));
</script>
<style>
#app {
  font-family: var(--font-family, 'Avenir', Helvetica, Arial, sans-serif);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
  height: 100%;
}

body {
  height: 100%;
}

.main h1, .main h2 {
  padding: 10px;
  margin: 0;
}

*,
*:before,
*:after {
  box-sizing: border-box;
  margin: 0;
}
</style>
