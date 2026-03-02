import { defineStore } from 'pinia';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import sdk from '@/services/sdk';
import { computed, defineAsyncComponent } from 'vue';

export const useStaticComponentsStore = defineStore('static-components', () => {
  const { loading, loaded, result, retry, promise } = useDispatcher<{components?: { componentName: string, js: string, css: string }[]}>(() => sdk.callJsonApi('/api/static').catch(() => {}));

  async function loadCss(fullUrl: string) {
    const style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('href', fullUrl);
    document.head.appendChild(style);
  }

  const staticComponents = computed(() => result.value?.components?.map(c => ({
    name: c.componentName,
    component: defineAsyncComponent(async () => {
      const [js] = await Promise.all([
        import(/* @vite-ignore */ c.js),
        loadCss(c.css),
      ])
      return js.default
    })
  })) || [])

  const headerComponent = computed(() => staticComponents.value.find(c => c.name === 'RootHeader')?.component as ReturnType<typeof defineAsyncComponent>);
  const NavigationComponent = computed(() => staticComponents.value.find(c => c.name === 'RootNavigation')?.component as ReturnType<typeof defineAsyncComponent>);
  const LoginComponent = computed(() => staticComponents.value.find(c => c.name === 'RootLogin')?.component as ReturnType<typeof defineAsyncComponent>);


  return {
    promise,
    loading,
    loaded,
    result,
    retry,
    staticComponents,
    headerComponent,
    NavigationComponent,
    LoginComponent
  }
});