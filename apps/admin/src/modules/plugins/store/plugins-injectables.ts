import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { watch, getCurrentInstance } from 'vue';
import * as vue from 'vue';
import * as vueRouter from 'vue-router';
import * as elementPlus from 'element-plus';
import * as vueI18n from 'vue-i18n';
import sdk from '@/services/sdk';
import { usePluginsStore } from './pluginsStore';
import { useStaticComponentsStore } from '@/modules/no-code/store/static-components';
import { i18n } from '@/plugins/i18n';

export function usePluginsInjectables() {
  const { appContext } = getCurrentInstance();
  const store = usePluginsList();
  const pluginsStore = usePluginsStore();
  const staticComponentsStore = useStaticComponentsStore();

  window['getApp'] = () => {
    return appContext.app;
  }
  window['getRouter'] = () => {
    return appContext.app.config.globalProperties.$router;
  }
  window['getSdk'] = () => sdk;
  window['getI18n'] = () => i18n;

  window['registerComponent'] = (name: string, component: any) => {
    pluginsStore.incrementComponentUpdates(name);
    appContext.app.component(name, component);
  }

  window['Vue'] = vue;
  window['VueRouter'] = vueRouter;
  window['ElementPlus'] = elementPlus;
  window['VueI18n'] = vueI18n;
  window['QelosSDK'] = sdk;
  

  let unwatch;

  function injectAll() {
    try {

      let allHTML = ''

      function addInjectable({ active, html }) {
        if (active) {
          allHTML += html
        }
      }

      store.plugins.forEach(plugin => {
        plugin.injectables?.forEach(addInjectable)
      })

      if (!allHTML) {
        pluginsStore.injectablesLoaded = true;
        return;
      }

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

      pluginsStore.injectablesLoaded = true;
    }

    catch (error) {

      pluginsStore.injectablesLoaded = true;
    } finally {
      if (unwatch) unwatch();
    }
  }

  unwatch = watch(() => store.plugins, injectAll);

  staticComponentsStore.promise.then(() => {
    staticComponentsStore.staticComponents.forEach(component => {
      appContext.app.component(component.name, component.component);
    });
  })
  
  return { injectablesLoaded: pluginsStore.injectablesLoaded, componentUpdates: pluginsStore.componentUpdates };
}