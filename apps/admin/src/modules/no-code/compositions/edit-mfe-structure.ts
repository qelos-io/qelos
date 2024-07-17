import { computed, provide, ref } from 'vue';
import { IMicroFrontend } from '@/services/types/plugin';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { useRoute } from 'vue-router';
import { useEditPlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

export function useEditMfeStructure() {
  const route = useRoute();
  const { load: loadPlugin, updatePlugin } = useEditPlugin()
  const addComponent = ref()
  const { reloadRequirements } = useScreenRequirementsStore()

  async function submitComponentToTemplate(data) {
    const el = document.createElement(data.component);

    Object.keys(data.props).forEach(propName => {
      el.setAttribute(propName, data.props[propName]);
    })

    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId)
    const routeMfe = route.meta.mfe as IMicroFrontend;

    const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === routeMfe._id);
    pluginMfe.structure ||= '';

    pluginMfe.structure += el.outerHTML.trim();
    pluginMfe.requirements ||= [];
    pluginMfe.requirements.push(...Object.values(data.requirements) as any[])

    await updatePlugin(plugin);

    routeMfe.structure = pluginMfe.structure;
    route.meta.screenRequirements = pluginMfe.requirements;
    reloadRequirements();
  }

  const removeComponent = useConfirmAction(async function removeComponent(el: HTMLElement) {
    const index = Array.from(el.parentElement.children).findIndex(child => child === el)

    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === routeMfe._id);
    const template = document.createElement('template');

    template.innerHTML = pluginMfe.structure;
    const child = template.content.children[index];
    template.content.removeChild(template.content.childNodes[index]);
    pluginMfe.structure = template.innerHTML.trim();

    child.getAttributeNames()
      .filter(attr => attr.startsWith('v-bind:'))
      .map(attr => child.getAttribute(attr).split('.')[0].replace('?', ''))
      .forEach(optionalKey => {
        if (pluginMfe.requirements.find(req => req.key === optionalKey)) {
          pluginMfe.requirements = pluginMfe.requirements.filter(req => req.key !== optionalKey)
        }
      })

    await updatePlugin(plugin)
    routeMfe.structure = pluginMfe.structure;
    route.meta.screenRequirements = pluginMfe.requirements;
  })

  provide('editableManager', computed(() => isEditingEnabled.value && {
    removeComponent
  }));

  return {
    addComponent,
    submitComponentToTemplate,
  }
}