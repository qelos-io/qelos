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

usePluginsInjectables().injectAll();

const appConfig = computed(() => config.value?.metadata && config.value.metadata || {})

watch(() => appConfig.value.language, async (language) => {
  await loadLanguageAsync(language)
  document.dir = translate('appDirection')
})

watch(() => appConfig.value.colorsPalette, async (palette) => {
  let appStyle = document.querySelector('#app-style');
  if (!appStyle) {
    appStyle = document.createElement('style');
    appStyle.setAttribute('id', 'app-style');
    document.body.prepend(appStyle);
  }
  appStyle.innerHTML = `
    :root {
      ${palette.bgColor ? `--body-bg: ${palette.bgColor};` : ''}
      ${palette.mainColor ? `--main-color: ${palette.mainColor};` : ''}
      --main-color-light: #d6eedd;
      --negative-color: #254044;
      ${palette.secondaryColor ? `--secondary-color: ${palette.secondaryColor};` : ''}
      --third-color: #c6dccc;
      ${palette.linksColor ? `--link: ${palette.linksColor};` : ''}
      ${palette.bordersColor ? `--border-color: ${palette.bordersColor};` : ''}
      ${palette.navigationBgColor ? `--nav-bg-color: ${palette.navigationBgColor};` : ''}
      ${palette.negativeColor ? `--negative-color: ${palette.negativeColor};` : ''}
      --el-menu-hover-bg-color: var(--main-color);
    }
  `;
})
</script>
<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--main-color);
  height: 100%;
}

html {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
