import { computed, provide, ref, type Ref } from 'vue';
import { IMicroFrontend } from '@/services/types/plugin';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { useRoute, useRouter } from 'vue-router';
import { useEditPlugin } from '@/modules/plugins/compositions/manage-plugin';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import {
  getElementByQlId,
  moveElement,
  moveStep,
  parseStructure,
  removeElement,
  serializeStructure,
  type DropPosition,
} from '@/modules/pre-designed/services/structure-ops';
import { insertBlock, mergeRequirements, type BuiltComponent } from '@/modules/pre-designed/services/build-component';

export type { DropPosition };

/** what the page editing UI can do to the blocks of the page, by block id (`data-ql-id`) */
export type EditableManager = {
  removeComponent: (qlId: string) => Promise<void>;
  editComponent: (qlId: string) => Promise<void>;
  addComponentBefore: (qlId: string) => void;
  addComponentAfter: (qlId: string) => void;
  reorderComponents: (draggedQlId: string, targetQlId: string, position: DropPosition) => Promise<void>;
  moveComponent: (qlId: string, direction: 'up' | 'down') => Promise<void>;
  setDraggingQlId: (qlId: string | null) => void;
  draggingQlId: Ref<string | null>;
};

export function useEditMfeStructure() {
  const route = useRoute();
  const router = useRouter();
  const { load: loadPlugin, updatePlugin } = useEditPlugin();
  const addComponentOptions = ref<{ beforeQlId?: string; afterQlId?: string }>();
  const { reloadRequirements } = useScreenRequirementsStore();
  const editedPluginMfe = ref<IMicroFrontend>();
  const editedComponentContext = ref();
  const draggingQlId = ref<string | null>(null);

  async function getUpdatedPluginAndMfe() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    const pluginMfe: IMicroFrontend = plugin.microFrontends.find((mfe) => mfe._id === routeMfe._id);
    return { plugin, pluginMfe, routeMfe };
  }

  async function fetchMfe() {
    editedPluginMfe.value = null;
    const { pluginMfe } = await getUpdatedPluginAndMfe();
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
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe();
    pluginMfe.structure = structure;
    pluginMfe.requirements = requirements;
    Object.assign(pluginMfe, otherSettings);
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  /** the freshest saved structure + a handle to save a changed one */
  async function editStructure(change: (html: string) => string) {
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe();
    const next = change(pluginMfe.structure || '');
    if (next === (pluginMfe.structure || '')) return;
    pluginMfe.structure = next;
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  /** saves a block built by the component panel into the page, at the anchor the panel was opened with */
  async function submitComponentToTemplate(built: BuiltComponent) {
    const options = addComponentOptions.value;
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe();
    pluginMfe.structure = insertBlock(pluginMfe.structure || '', built, options).html;
    pluginMfe.requirements = mergeRequirements(pluginMfe.requirements, Object.values(built.requirements));
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  }

  async function clonePage() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    const pluginMfe: IMicroFrontend = plugin.microFrontends.find((mfe) => mfe._id === routeMfe._id);

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

  /** `qlId` null: the whole page (no block picked) */
  async function getEditedComponent(qlId: string | null) {
    const { pluginMfe, routeMfe, plugin } = await getUpdatedPluginAndMfe();
    const template = parseStructure(pluginMfe.structure);
    const child = qlId === null ? undefined : getElementByQlId(template, qlId);
    if (qlId !== null && !child) {
      return { template, pluginMfe, routeMfe, plugin } as any;
    }
    return { template, editChild: child, routeMfe, pluginMfe, plugin };
  }

  const removeComponent = useConfirmAction(
    async function removeComponent(qlId: string) {
      const { editChild, pluginMfe, template, routeMfe, plugin } = await getEditedComponent(qlId);
      if (!editChild) {
        return;
      }
      editChild.remove();
      pluginMfe.structure = serializeStructure(template);

      editChild
        .getAttributeNames()
        .filter((attr) => attr.startsWith('v-bind:'))
        .map((attr) => editChild.getAttribute(attr).split('.')[0].replace('?', ''))
        .forEach((optionalKey) => {
          if (pluginMfe.requirements.find((req) => req.key === optionalKey)) {
            pluginMfe.requirements = pluginMfe.requirements.filter((req) => req.key !== optionalKey);
          }
        });

      await updatePlugin(plugin);
      updateRouteFromPluginMfe(routeMfe, pluginMfe);
    },
    { text: 'Remove this block from the page?' },
  );

  const editComponent = async function (qlId: string) {
    editedComponentContext.value = { ...(await getEditedComponent(qlId)), qlId };
  };
  const finishEditComponent = async function (newElement: HTMLElement) {
    const { pluginMfe, template, routeMfe, plugin, editChild } = editedComponentContext.value;
    if (!editChild) {
      return;
    }
    editChild.replaceWith(newElement);
    pluginMfe.structure = serializeStructure(template);
    await updatePlugin(plugin);
    updateRouteFromPluginMfe(routeMfe, pluginMfe);
  };

  const removePage = useConfirmAction(async function removePage() {
    const plugin = await loadPlugin((route.meta.mfe as IMicroFrontend).pluginId);
    const routeMfe = route.meta.mfe as IMicroFrontend;
    plugin.microFrontends = plugin.microFrontends.filter((mfe) => mfe._id !== routeMfe._id);
    await updatePlugin(plugin);
    await router.push('/');
  });

  async function reorderComponents(draggedQlId: string, targetQlId: string, position: DropPosition) {
    await editStructure((html) => moveElement(html, draggedQlId, targetQlId, position));
  }

  async function moveComponent(qlId: string, direction: 'up' | 'down') {
    await editStructure((html) => moveStep(html, qlId, direction));
  }

  provide(
    'editableManager',
    computed<EditableManager | false>(() => {
      if (!isEditingEnabled.value) {
        return false;
      }
      return {
        removeComponent,
        editComponent,
        addComponentBefore: (qlId: string) => (addComponentOptions.value = { beforeQlId: qlId }),
        addComponentAfter: (qlId: string) => (addComponentOptions.value = { afterQlId: qlId }),
        reorderComponents,
        moveComponent,
        setDraggingQlId: (qlId: string | null) => (draggingQlId.value = qlId),
        draggingQlId,
      };
    }),
  );

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
    finishEditComponent,
    removeComponent,
    editComponent,
    reorderComponents,
    moveComponent,
  };
}
