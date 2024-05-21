import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { watch } from 'vue';

export function usePluginsInjectables() {
  const store = usePluginsList();

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