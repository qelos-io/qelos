import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { watch, getCurrentInstance } from 'vue';
import sdk from '@/services/sdk';

export function usePluginsInjectables() {
  const { appContext } = getCurrentInstance();
  const store = usePluginsList();

  window['getApp'] = () => {
    return appContext.app;
  }
  window['getRouter'] = () => {
    return appContext.app.config.globalProperties.$router;
  }
  window['getSdk'] = () => sdk;

  let unwatch;

  function injectAll() {
    let allHTML = ''

    function addInjectable({ active, html }) {
      if (active) {
        allHTML += html
      }
    }

    store.plugins.forEach(plugin => plugin.injectables?.forEach(addInjectable))

    const template = document.createElement('template');
    template.innerHTML = allHTML;

    document.body.append(template.content);

    unwatch();
  }

  unwatch = watch(() => store.plugins, injectAll);
}