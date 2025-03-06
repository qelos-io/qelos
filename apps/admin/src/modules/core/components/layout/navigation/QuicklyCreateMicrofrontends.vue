<template>
  <el-form @submit.prevent="submit">
    <el-drawer v-model="localDialogVisible" title="Create New Plugin" size="40%" class="create-plugin-drawer"
               direction="btt">
      <FormRowGroup>
        <el-form-item label="Select Plugin">
          <el-select v-model="pluginList" placeholder="Select Plugin" clearable
                     @change="handleMenuCommand" placement="top-start" teleported>
            <el-option v-for="plugin in plugins" :key="plugin._id" :label="plugin.name" :value="plugin._id">
              {{ plugin.name }}
            </el-option>
            <el-option label="Add New Page" value="addNewPage">-- {{ $t('Add New Plugin') }} --</el-option>
          </el-select>
        </el-form-item>
        <NavigationPositionSelector v-model="position" class="full-width-input"/>
        <FormInput v-model="pageName" placeholder="Enter Page Name" required size="large" class="full-width-input"
                   title="Page Name"/>
      </FormRowGroup>
      <FormRowGroup>
        <FormInput type="switch" v-model="showBoilerplating" title="Boilerplate ?" class="flex-0"/>
        <template v-if="showBoilerplating">
          <BlueprintSelector v-model="boilerplateBlueprint"/>
          <FormInput type="select" v-model="boilerplateType">
            <template #options>
              <el-option value="table" :label="$t('Table')"/>
<!--              <el-option value="grid" :label="$t('Grid')"/>-->
<!--              <el-option value="block" :label="$t('Blocks')"/>-->
            </template>
          </FormInput>
        </template>
      </FormRowGroup>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog" native-type="button">{{ $t('Cancel') }}</el-button>
          <el-button type="primary" native-type="submit">
            {{ $t('Confirm') }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </el-form>
</template>

<script lang="ts" setup>
import { capitalize, ref, watch } from 'vue';
import { IScreenRequirement } from '@qelos/global-types';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useCreatePlugin } from '@/modules/plugins/compositions/manage-plugin';
import pluginsService from '@/services/plugins-service';
import { useNotifications } from '@/modules/core/compositions/notifications';
import NavigationPositionSelector from '@/modules/plugins/components/NavigationPositionSelector.vue';
import FormInput from '../../forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import BlueprintSelector from '@/modules/no-code/components/BlueprintSelector.vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useEditorComponents } from '@/modules/pre-designed/compositions/editor-components';
import { getPlural } from '@/modules/core/utils/texts';

const { plugins, retry } = usePluginsList();
const { savePlugin } = useCreatePlugin();
const { success, error } = useNotifications();

const pluginList = ref('');
const position = ref<string | boolean>(false);
const pageName = ref('');

const props = defineProps({
  modelValue: Boolean  // modelValue from Navigation
});
const emit = defineEmits(['update:modelValue']);

const localDialogVisible = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
  localDialogVisible.value = newValue;
});

// When local state changes, send it upstream via emit
watch(localDialogVisible, (newValue) => {
  emit('update:modelValue', newValue);
});


const showBoilerplating = ref(false);
const boilerplateBlueprint = ref('');
const boilerplateType = ref('table');

const blueprintsStore = useBlueprintsStore()
const { availableComponents, getColumnsFromBlueprint } = useEditorComponents()

async function getBoilerPlate() {
  const selectedBlueprint = showBoilerplating.value && blueprintsStore.blueprints.find(b => b.identifier === boilerplateBlueprint.value);
  const pageTitle = capitalize(pageName.value);
  if (!showBoilerplating.value || !selectedBlueprint) {
    return {
      structure: `<h1>${pageTitle}</h1>`,
      requirements: []
    };
  }
  const boilerplate: { structure: string, requirements: IScreenRequirement[] } = {
    structure: `<list-page-title title="${pageTitle}" v-bind:create-route-query="{ mode: $route.query.mode ? undefined : 'create' }" />`,
    requirements: [{
      key: 'pageState',
      fromData: {
        pageTitle: pageTitle
      }
    }]
  }

  if (boilerplateType.value === 'table') {
    const dataKey = getPlural(selectedBlueprint.identifier);
    boilerplate.structure += `<quick-table :columns="tableColumns" :data="${dataKey}.result">
${availableComponents['quick-table']?.getInnerHTML({ data: dataKey }, {})}
</quick-table>`
    boilerplate.requirements.push({
      key: 'tableColumns',
      fromData: [...getColumnsFromBlueprint(selectedBlueprint.identifier), { prop: '_operations', label: ' ' }]
    })
    boilerplate.requirements.push({
      key: dataKey,
      fromBlueprint: {
        name: selectedBlueprint.identifier
      }
    })
    boilerplate.structure += `<remove-confirmation v-model="pageState.${dataKey}ToRemove" target="blueprint" resource="${selectedBlueprint.identifier}"></remove-confirmation>`
  }

  return boilerplate;
}


const closeDialog = () => {
  localDialogVisible.value = false;
};

const submit = async () => {
  // Check if the necessary fields have values
  if (!pluginList.value) {
    error('No plugin selected.');
    return;
  }

  if (position.value === '' || position.value === null || position.value === false) {
    error('No position selected.');
    return;
  }

  if (!pageName.value) {
    error('No position selected.');
    return;
  }

  try {
    if (pluginList.value === 'addNewPage') {
      // Handle the "Add New Page" case by creating a new plugin
      await createPlugin(position.value as string, pageName.value);

    } else {
      // Handle adding MFE to existing plugin
      await addMicroFrontendToPlugin(pluginList.value, position.value as string, pageName.value);
      success('Micro-frontend added to plugin.');
    }

    // Reset form values after submission
    pluginList.value = '';
    position.value = '';
    pageName.value = '';

    // Close the form after successful submission
    localDialogVisible.value = false;


  } catch (error) {
    console.error('Error during form submission:', error);
  }
};

const handleMenuCommand = (pluginId: string) => {
  const selectedPlugin = plugins.find(plugin => plugin._id === pluginId);
  if (selectedPlugin) {
    pluginList.value = selectedPlugin.name;

  }
};

const addMicroFrontendToPlugin = async (pluginId: string, position: string, mfeName: string) => {
  const selectedPlugin = plugins.find(plugin => plugin.name === pluginId);

  if (selectedPlugin) {
    const mfeTemplate = selectedPlugin.microFrontends[0] || {} as any; // Template for the new MFE
    const boilerplate = await getBoilerPlate();

    const newMFE = {
      name: mfeName || 'New MFE', // Name from the form or default value
      description: mfeTemplate.description || 'Description for the MFE',
      manifestUrl: mfeTemplate.manifestUrl || '',
      url: mfeTemplate.url || '',
      active: true,
      opened: true,
      roles: mfeTemplate.roles || ['*'],
      workspaceRoles: mfeTemplate.workspaceRoles || ['*'],
      workspaceLabels: mfeTemplate.workspaceLabels || ['*'],
      use: mfeTemplate.use || 'plain',
      requirements: boilerplate.requirements || [],
      route: {
        name: mfeName.toLowerCase().replace(/\s+/g, '-') + '-copy',
        path: mfeName.toLowerCase().replace(/\s+/g, '-') + '-copy',
        roles: mfeTemplate.route?.roles || ['*'],
        navBarPosition: position as 'top' | 'bottom' | 'user-dropdown' | false,
      },
      structure: boilerplate.structure
    };

    selectedPlugin.microFrontends.push(newMFE);

    await pluginsService.update(selectedPlugin._id, selectedPlugin);

    retry();

  } else {
    error('No plugin found with the given ID.');
  }
};

const createPlugin = async (position: string, pluginName: string) => {
  if (pluginName.trim()) {
    const formattedPluginName = pluginName.toLowerCase().replace(/\s+/g, '-');
    const boilerplate = await getBoilerPlate();

    const newPlugin = {
      name: pluginName,
      microFrontends: [
        {
          name: pluginName,
          description: '',
          use: 'plain',
          active: true,
          opened: true,
          url: '',
          roles: ['*'],
          workspaceRoles: ['*'],
          workspaceLabels: ['*'],
          route: {
            name: formattedPluginName,
            path: formattedPluginName,
            navBarPosition: position,
          },
          structure: boilerplate.structure,
          requirements: boilerplate.requirements,
        },
      ],
    };

    await savePlugin(newPlugin);

  }
};
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: space-between;
}

.create-plugin-drawer {
  --el-drawer-padding-primary: 10px;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
}

.full-width-input {
  width: 100%;
}

.el-input {
  height: 38px; /* Set your desired height */
}
</style>