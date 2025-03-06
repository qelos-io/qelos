import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { watch, getCurrentInstance } from 'vue';
import * as vue from 'vue';
import * as vueRouter from 'vue-router';
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
  window['registerComponent'] = (name: string, component: any) => {
    appContext.app.component(name, component);
  }
  window['Vue'] = vue;
  window['VueRouter'] = vueRouter;

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

    const scripts = template.content.querySelectorAll('script');
    const clonedScripts = Array.from(scripts).map(script => {
      const clone = document.createElement('script');
      script.getAttributeNames().forEach(attr => {
        try {
          clone.setAttribute(attr, script.getAttribute(attr));
        } catch {
          //
        }
      })
      clone.innerHTML = script.innerHTML;
      script.remove();
      return clone;
    });

    document.body.append(template.content);
    if (clonedScripts?.length) {
      clonedScripts.forEach(script => document.body.append(script));
    }

    unwatch();
  }

  unwatch = watch(() => store.plugins, injectAll);
}