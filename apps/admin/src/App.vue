<template>
  <div id="app">
    <router-view v-if="config"/>
  </div>
</template>
<script lang="ts" setup>
import {useAppConfiguration} from './modules/configurations/store/app-configuration'
import {computed, watch} from 'vue'
import {translate, loadLanguageAsync} from './plugins/i18n'
import {usePluginsInjectables} from '@/modules/plugins/store/plugins-injectables';

const config = useAppConfiguration()

usePluginsInjectables();

const appConfig = computed(() => config.value?.metadata && config.value.metadata || {})

watch(() => appConfig.value.language, async (language) => {
  await loadLanguageAsync(language)
  document.dir = translate('appDirection')
})

watch(() => {
  const cssUrl = appConfig.value.themeStylesUrl;
  const palette = appConfig.value.colorsPalette;
  return {
    cssUrl,
    palette,
  }
}, ({cssUrl, palette}) => {
  let appStyle = document.querySelector('#app-style');
  if (!appStyle) {
    appStyle = document.createElement('style');
    appStyle.setAttribute('id', 'app-style');
    document.body.prepend(appStyle);
  }
  const importCss = cssUrl ? `@import "${cssUrl}";` : '';
  palette = palette || {};

  appStyle.innerHTML = `
    ${importCss}
    html {
      font-family: 'Avenir', Helvetica, Arial, sans-serif;
      font-size: 16px;
      word-spacing: 1px;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
      -moz-osx-font-smoothing: grayscale;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }
    :root {
      ${palette.bgColor ? `--body-bg: ${palette.bgColor};` : ''}
      ${palette.mainColor ? `--main-color: ${palette.mainColor};` : ''}
      --main-color-light: #d6eedd;
      ${palette.textColor ? `--text-color: ${palette.textColor};` : ''}
      ${palette.secondaryColor ? `--secondary-color: ${palette.secondaryColor};` : ''}
      ${palette.thirdColor ? `--third-color: ${palette.thirdColor};` : '--third-color: #c6dccc;'}
      ${palette.linksColor ? `--link: ${palette.linksColor};` : ''}
      ${palette.bordersColor ? `--border-color: ${palette.bordersColor};` : ''}
      ${palette.inputsTextColor ? `--inputs-text-color: ${palette.inputsTextColor};` : ''}
      ${palette.inputsBgColor ? `--inputs-bg-color: ${palette.inputsBgColor};` : ''}
      ${palette.navigationBgColor ? `--nav-bg-color: ${palette.navigationBgColor};` : ''}
      ${palette.negativeColor ? `--negative-color: ${palette.negativeColor};` : '--negative-color: #254044;'}
      --el-menu-hover-bg-color: var(--main-color);
    }
  `;
})

watch(() => appConfig.value.scriptUrl, () => {
  if(!appConfig.value.scriptUrl) {
    return;
  }
  const script = document.createElement('script');
  script.setAttribute('src',appConfig.value.scriptUrl);
  document.head.appendChild(script);
})
</script>
<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--main-color);
  height: 100%;
}

html {
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
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
