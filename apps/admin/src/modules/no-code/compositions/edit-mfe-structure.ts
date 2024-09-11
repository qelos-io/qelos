import { computed, provide, ref } from 'vue';
import { IMicroFrontend } from '@/services/types/plugin';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { useRoute, useRouter } from 'vue-router';
import { useEditPlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

export function useEditMfeStructure() {
  const route = useRoute();
  const router = useRouter()
  const { load: loadPlugin, updatePlugin } = useEditPlugin()
  const addComponent = ref()
  const { reloadRequirements } = useScreenRequirementsStore()
  const editedPluginMfe = ref<IMicroFrontend>()
  const editedComponentContext = ref();

  async function getUpdatedPluginAndMfe() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId)
    const routeMfe = route.meta.mfe as IMicroFrontend;

    const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === routeMfe._id);

    return {
      plugin,
      pluginMfe,
      routeMfe
    }
  }

  async function fetchMfe() {
    editedPluginMfe.value = null;
    const { pluginMfe } = await getUpdatedPluginAndMfe()
    editedPluginMfe.value = pluginMfe;
  }

  function updateRouteFromPluginMfe(routeMfe, pluginMfe: IMicroFrontend) {
    routeMfe.structure = pluginMfe.structure;
    route.meta.screenRequirements = pluginMfe.requirements;
    route.meta.searchQuery = pluginMfe.searchQuery;
    route.meta.searchPlaceholder = pluginMfe.searchPlaceholder;
    route.meta.roles = pluginMfe.roles;
    route.meta.workspaceRoles = pluginMfe.workspaceRoles;
    reloadRequirements();
  }

  async function submitCodeToTemplate(structure: string, requirements: any[], otherSettings: Partial<IMicroFrontend>) {
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe()

    pluginMfe.structure = structure;
    pluginMfe.requirements = requirements;
    Object.assign(pluginMfe, otherSettings);
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  async function submitComponentToTemplate(data) {
    const el = document.createElement(data.component);

    Object.keys(data.props).forEach(propName => {
      el.setAttribute(propName, data.props[propName]);
    })

    if (data.innerHTML) {
      el.innerHTML = data.innerHTML;
    }
    if (data.classes) {
      el.classList.add(data.classes)
    }

    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe()

    pluginMfe.structure ||= '';

    pluginMfe.structure += el.outerHTML.trim();
    pluginMfe.requirements ||= [];
    pluginMfe.requirements.push(...Object.values(data.requirements) as any[])

    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  async function clonePage() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    const pluginMfe: IMicroFrontend = plugin.microFrontends.find(mfe => mfe._id === routeMfe._id);

    const clone: IMicroFrontend = JSON.parse(JSON.stringify(pluginMfe));
    clone.name = clone.name + ' (copy)';
    clone.route.path = clone.route.path + '-copy';
    if (clone.route.name) {
      clone.route.name = clone.route.name + '-copy';
    }
    delete clone._id;
    plugin.microFrontends.push(clone);

    await updatePlugin(plugin);
    location.reload();
  }

  async function getEditedComponent(el: Element) {
    const qlId = el.getAttribute('data-ql-id');

    if (!qlId) {
      return {};
    }
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe()
    const template = document.createElement('template');
    let child;
    template.innerHTML = pluginMfe.structure;
    const elements = Array.from(template.content.querySelectorAll('*'));
    elements.length = Number(qlId.split('-inner')[0]) + 2;
    elements.forEach((el, index) => {
      const id = index.toString();
      el.setAttribute('data-ql-id', id);

      if (qlId === id) {
        child = el;
      }

      if (el.tagName.toLowerCase() === 'template') {
        Array.from((el as HTMLTemplateElement).content.querySelectorAll('*')).forEach((innerEl, innerIndex) => {
          const innerId = index.toString() + '-inner-' + innerIndex.toString();
          innerEl.setAttribute('data-ql-id', innerId);
          if (innerId === qlId) {
            child = innerEl;
          }
        })
      }
    })
    child = child || elements[Number(qlId)];
    elements.forEach((el) => {
      el?.removeAttribute('data-ql-id');

      if (el.tagName.toLowerCase() === 'template') {
        Array.from((el as HTMLTemplateElement).content.querySelectorAll('*')).forEach((innerEl) => {
          innerEl.removeAttribute('data-ql-id');
        })
      }
    })

    return {
      template,
      editChild: child,
      routeMfe,
      pluginMfe,
      plugin
    };
  }

  const removeComponent = useConfirmAction(async function removeComponent(el: HTMLElement) {
    const { editChild, pluginMfe, template, routeMfe, plugin } = await getEditedComponent(el);
    if (!editChild) {
      return;
    }
    editChild.remove();
    pluginMfe.structure = template.innerHTML.trim();

    editChild.getAttributeNames()
      .filter(attr => attr.startsWith('v-bind:'))
      .map(attr => editChild.getAttribute(attr).split('.')[0].replace('?', ''))
      .forEach(optionalKey => {
        if (pluginMfe.requirements.find(req => req.key === optionalKey)) {
          pluginMfe.requirements = pluginMfe.requirements.filter(req => req.key !== optionalKey)
        }
      })

    await updatePlugin(plugin)
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  })

  const editComponent = async function (el: HTMLElement) {
    editedComponentContext.value = await getEditedComponent(el);
  }
  const finishEditComponent = async function (newElement: HTMLElement) {
    const { pluginMfe, template, routeMfe, plugin, editChild } = editedComponentContext.value;

    if (!editChild) {
      return;
    }

    editChild.replaceWith(newElement);
    pluginMfe.structure = template.innerHTML.trim();

    await updatePlugin(plugin)
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  const removePage = useConfirmAction(async function removePage() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    plugin.microFrontends = plugin.microFrontends.filter(mfe => mfe._id !== routeMfe._id);

    await updatePlugin(plugin)
    await router.push('/');
  })

  provide('editableManager', computed(() => isEditingEnabled.value && {
    removeComponent,
    editComponent,
  }));

  return {
    pageName: computed(() => route.meta.name as string),
    addComponent,
    submitComponentToTemplate,
    fetchMfe,
    editedPluginMfe,
    submitCodeToTemplate,
    clonePage,
    removePage,
    editedComponentContext,
    finishEditComponent
  }
}