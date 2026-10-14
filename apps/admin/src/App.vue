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
import { usePluginsStore } from './modules/plugins/store/pluginsStore';
import { usePubSubNotifications } from './modules/core/compositions/pubsub-notifications';
import { useUsersHeader } from './modules/configurations/store/users-header';
import { usePluginsMicroFrontends } from './modules/plugins/store/plugins-microfrontends';
import { buildThemeCss, isColorDark, resolveThemeSettings } from './modules/core/services/theme';


usePluginsMicroFrontends();

const { appConfig, loaded } = useAppConfiguration()
const vm = getCurrentInstance();
useUsersHeader()

provide('appConfig', appConfig);

// Initialize plugins injectables at setup time
usePluginsInjectables();

const pluginsStore = usePluginsStore(); 

const isAppReady = computed(() => loaded.value && pluginsStore.injectablesLoaded);

watch(() => appConfig.value.language, async (language) => {
  await loadLanguageAsync(language)
  document.dir = translate('appDirection')
})

watch(() => resolveThemeSettings(appConfig.value), ({ cssUrl, palette: themePalette, borderRadius, baseFontSize, fontFamily, headingsFontFamily, buttonRadius, spacing, shadowStyle, animationSpeed }) => {
  let palette = themePalette;
  let appStyle = document.querySelector('#app-style');
  if (!appStyle) {
    appStyle = document.createElement('style');
    appStyle.setAttribute('id', 'app-style');
    document.body.prepend(appStyle);
  }
  palette = palette || {};

  // Determine if this is a dark theme based on background color brightness
  // themes may ask for web fonts; only Google Fonts stylesheets are accepted
  const fontsUrl: string | undefined = palette.fontsUrl;
  let fontsLink = document.querySelector<HTMLLinkElement>('#app-fonts');
  if (typeof fontsUrl === 'string' && fontsUrl.startsWith('https://fonts.googleapis.com/')) {
    if (!fontsLink) {
      fontsLink = document.createElement('link');
      fontsLink.id = 'app-fonts';
      fontsLink.rel = 'stylesheet';
      document.head.appendChild(fontsLink);
    }
    if (fontsLink.href !== fontsUrl) {
      fontsLink.href = fontsUrl;
    }
  } else {
    fontsLink?.remove();
  }

  const isDarkTheme = palette?.bgColor ? isColorDark(palette.bgColor) : false;

  vm.appContext.config.globalProperties.$isDarkTheme = isDarkTheme;
  
  if (isDarkTheme) {
    document.documentElement.setAttribute('data-dark-mode', 'true');
  } else {
    document.documentElement.removeAttribute('data-dark-mode');
  }

  appStyle.innerHTML = buildThemeCss({ cssUrl, palette, borderRadius, baseFontSize, fontFamily, headingsFontFamily, buttonRadius, spacing, shadowStyle, animationSpeed });
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
