<script setup lang="ts">
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import PreDesignedScreensSelector from '@/modules/plugins/components/PreDesignedScreensSelector.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import NavigationPositionSelector from '@/modules/plugins/components/NavigationPositionSelector.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { inject, ref } from 'vue';
import { IPlugin } from '@/services/types/plugin';
import { UnwrapNestedRefs } from '@vue/reactivity';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { MfeBaseTemplate } from '@/modules/plugins/types';

const edit = inject<UnwrapNestedRefs<Partial<IPlugin>>>('edit');

function addMoreMicroFrontend() {
  if (!edit.microFrontends) edit.microFrontends = [];

  edit.microFrontends = [
    ...edit.microFrontends,
    {
      name: '',
      description: '',
      active: true,
      opened: true,
      url: '',
      roles: ['*'],
      workspaceRoles: ['*']
    }]
}

function getBasicMfe(): {
  name: string;
  path: string;
  roles: string[],
  navBarPosition: 'top' | 'bottom' | 'user-dropdown' | false;
  group?: string;
} {
  return {
    navBarPosition: false,
    name: '',
    path: '',
    roles: [] as string[]
  }
}

const columns = ref([
  {
    prop: 'active',
    label: '',
  },
  {
    prop: 'name',
    label: 'Name',
  },
  {
    prop: 'url',
    label: 'URL'
  },
  {
    prop: 'use',
    label: 'Base Template'
  },
  {
    prop: 'roles',
    label: 'Roles'
  },
  {
    prop: 'workspaceRoles',
    label: 'Workspace Roles'
  },
  {
    prop: 'route',
    label: 'Route'
  },
  {
    prop: 'operation',
    label: ''
  }
])

const editedMfe = ref();
const editedMfeIndex = ref(-1);
const editingMode = ref(false);

function openModal(row: any, index: number) {
  editedMfe.value = JSON.parse(JSON.stringify(row));
  editedMfeIndex.value = index;
  editingMode.value = true;
}

function submitMfe() {
  edit.microFrontends[editedMfeIndex.value] = editedMfe.value;
  editingMode.value = false;
}
</script>

<template>
  <QuickTable :data="edit.microFrontends" :columns="columns">
    <template #active="{row}">
      <font-awesome-icon v-if="row.active" :icon="['fas', 'check']"/>
    </template>
    <template #use="{row}">
      {{ MfeBaseTemplate[row.use] }}
    </template>
    <template #route="{row}">
      /{{ row.route?.path }}
    </template>
    <template #operation="{row, $index}">
      <el-button text @click="openModal(row, $index)">
        <font-awesome-icon :icon="['far', 'pen-to-square']"/>
      </el-button>
      <RemoveButton @click="edit.microFrontends.splice($index, 1)"/>
    </template>
  </QuickTable>
  <AddMore @click="addMoreMicroFrontend"/>

  <el-form @submit.stop="submitMfe">
    <el-dialog v-model="editingMode" :title="$t('Edit Micro-Frontend')">
      <FormRowGroup>
        <FormInput class="flex-0" type="switch" v-model="editedMfe.active"/>
        <FormInput title="Name" v-model="editedMfe.name"/>
        <FormInput title="Description" v-model="editedMfe.description"/>
      </FormRowGroup>
      <FormRowGroup>
        <FormInput class="flex-0" type="switch" title="Guest?" v-model="editedMfe.guest"/>
        <FormInput title="URL" v-model="editedMfe.url"/>
        <template v-if="!editedMfe.guest">
          <FormInput title="Roles" :model-value="editedMfe.roles.join(',')"
                     @update:modelValue="editedMfe.roles = $event.split(',')"/>
          <FormInput title="Workspace Roles" :model-value="editedMfe.workspaceRoles"
                     @update:modelValue="editedMfe.workspaceRoles = $event.split(',')"/>
        </template>

      </FormRowGroup>
      <FormInput title="Route?" type="switch"
                 :model-value="!!editedMfe.route"
                 @change="editedMfe.route = $event ? getBasicMfe() : undefined"/>
      <FormRowGroup v-if="editedMfe.route">
        <FormInput title="Route Name" v-model="editedMfe.route.name"/>
        <FormInput title="Route Path" v-model="editedMfe.route.path" required/>
        <NavigationPositionSelector v-model="editedMfe.route.navBarPosition"/>
      </FormRowGroup>
      <FormRowGroup>
        <FormInput title="No code / Low Code Screens?" type="switch"
                   :model-value="!!editedMfe.use"
                   @change="editedMfe.use = $event ? 'plain' : undefined"/>
        <PreDesignedScreensSelector v-if="editedMfe.use" v-model="editedMfe.use"/>
      </FormRowGroup>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click.stop.prevent="editingMode = false">Cancel</el-button>
          <div>
            <el-button type="primary" @click="submitMfe">
              Confirm
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </el-form>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
}
</style>