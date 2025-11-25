import { computed, provide, ref, type Ref } from 'vue';
import { IMicroFrontend } from '@/services/types/plugin';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { useRoute, useRouter } from 'vue-router';
import { useEditPlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

export type DragPosition = 'before' | 'after';

export type EditableManager = {
  removeComponent: (el: HTMLElement) => Promise<void>;
  editComponent: (el: HTMLElement) => Promise<void>;
  addComponentBefore: (el: HTMLElement) => void;
  addComponentAfter: (el: HTMLElement) => void;
  reorderComponents: (draggedQlId: string, targetQlId: string, position: DragPosition) => Promise<void>;
  setDraggingQlId: (qlId: string | null) => void;
  draggingQlId: Ref<string | null>;
};

function createTemplateFromStructure(structure?: string) {
  const template = document.createElement('template');
  template.innerHTML = structure || '';
  return template;
}

function getElementByQlId(template: HTMLTemplateElement, qlId?: string | null) {
  if (!qlId) {
    return null;
  }
  const [outerIndexRaw, innerIndexRaw] = qlId.split('-inner-');
  const outerIndex = Number(outerIndexRaw);
  if (Number.isNaN(outerIndex)) {
    return null;
  }
  const elements = Array.from(template.content.querySelectorAll('*'));
  const outerEl = elements[outerIndex];
  if (!outerEl) {
    return null;
  }
  if (innerIndexRaw === undefined) {
    return outerEl;
  }
  if (outerEl.tagName.toLowerCase() !== 'template') {
    return null;
  }
  const innerIndex = Number(innerIndexRaw);
  if (Number.isNaN(innerIndex)) {
    return null;
  }
  return Array.from((outerEl as HTMLTemplateElement).content.querySelectorAll('*'))[innerIndex] || null;
}

export function useEditMfeStructure() {
  const route = useRoute();
  const router = useRouter()
  const { load: loadPlugin, updatePlugin } = useEditPlugin()
  const addComponentOptions = ref<{ beforeEl?: HTMLElement, afterEl?: HTMLElement }>()
  const { reloadRequirements } = useScreenRequirementsStore()
  const editedPluginMfe = ref<IMicroFrontend>()
  const editedComponentContext = ref();
  const draggingQlId = ref<string | null>(null);

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
    route.meta.workspaceLabels = pluginMfe.workspaceLabels;
    route.meta.iconName = pluginMfe.route.iconName;
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
    const options = addComponentOptions.value;

    Object.keys(data.props).forEach(propName => {
      try {
        el.setAttribute(propName, data.props[propName]);
      } catch {
        //
      }
    })

    if (data.innerHTML) {
      el.innerHTML = data.innerHTML;
    }
    if (data.classes) {
      el.classList.add(data.classes)
    }

    const {
      editChild,
      pluginMfe,
      template,
      routeMfe,
      plugin
    } = await getEditedComponent(options.beforeEl || options.afterEl || null);

    if (options.beforeEl) {
      (editChild as HTMLElement).before(el);
    } else if (options.afterEl) {
      (editChild as HTMLElement).after(el);
    } else {
      template.content.appendChild(el);
    }
    pluginMfe.structure = template.innerHTML.trim();
    pluginMfe.requirements ||= [];
    pluginMfe.requirements.push(...Object.values(data.requirements) as any[])

    const uniqueRequirements = {};
    pluginMfe.requirements.forEach(req => {
      if (!uniqueRequirements[req.key]) {
        uniqueRequirements[req.key] = req;
        return;
      }
      if (uniqueRequirements[req.key].fromData && req.fromData) {
        Object.assign(uniqueRequirements[req.key].fromData, req.fromData);
      }
    })
    pluginMfe.requirements = Object.values(uniqueRequirements);

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

  async function getEditedComponent(el: Element | null) {
    const qlId = el?.getAttribute('data-ql-id');

    if (el !== null && !qlId) {
      return {};
    }
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe()
    const template = createTemplateFromStructure(pluginMfe.structure);
    let child;
    if (el !== null) {
      child = getElementByQlId(template, qlId);
    }

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

  async function reorderComponents(draggedQlId: string, targetQlId: string, position: DragPosition) {
    if (!draggedQlId || !targetQlId || draggedQlId === targetQlId) {
      return;
    }
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe();
    const template = createTemplateFromStructure(pluginMfe.structure);
    const draggedNode = getElementByQlId(template, draggedQlId);
    const targetNode = getElementByQlId(template, targetQlId);

    if (!draggedNode || !targetNode || draggedNode === targetNode) {
      return;
    }

    if (position === 'before') {
      targetNode.before(draggedNode);
    } else {
      targetNode.after(draggedNode);
    }

    pluginMfe.structure = template.innerHTML.trim();
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  provide('editableManager', computed<EditableManager | false>(() => {
    if (!isEditingEnabled.value) {
      return false;
    }
    return {
      removeComponent,
      editComponent,
      addComponentBefore: (el: HTMLElement) => addComponentOptions.value = { beforeEl: el },
      addComponentAfter: (el: HTMLElement) => addComponentOptions.value = { afterEl: el },
      reorderComponents,
      setDraggingQlId: (qlId: string | null) => draggingQlId.value = qlId,
      draggingQlId,
    };
  }));

  return {
    pageName: computed(() => route.meta.name as string),
    addComponentOptions,
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