<template>
  <div id="app">
    <router-view v-if="isAppReady"/>
  </div>
</template>
<script lang="ts" setup>
import { useAppConfiguration } from './modules/configurations/store/app-configuration'
import { computed, provide, ref, watch } from 'vue'
import { translate, loadLanguageAsync } from './plugins/i18n'
import { usePluginsInjectables } from '@/modules/plugins/store/plugins-injectables';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { usePluginsStore } from './modules/plugins/store/pluginsStore';
import { usePubSubNotifications } from './modules/core/compositions/pubsub-notifications';
import { useUsersHeader } from './modules/configurations/store/users-header';

const { appConfig, loaded } = useAppConfiguration()
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
  const borderRadius = appConfig.value.borderRadius;
  return {
    cssUrl,
    palette,
    borderRadius,
  }
}, ({ cssUrl, palette }) => {
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
    :root {
      --border-radius: ${typeof appConfig.value.borderRadius === 'number' ? appConfig.value.borderRadius : 5}px;
      --base-font-size: ${typeof appConfig.value.baseFontSize === 'number' ? appConfig.value.baseFontSize : 16}px;
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
    }
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
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
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
