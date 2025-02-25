<template>
  <div class="flex-row">
    <el-form @submit.native.prevent="save" class="workspace-configuration-form flex-4">
      <FormRowGroup>
        <FormInput class="flex-0 active-input" v-model="edited.isActive" title="Is Active" type="switch"/>
        <el-form-item class="flex-1">
          <template #label>
            {{ $t('Privileged Roles for Creation') }}
            <InfoIcon content="Define the minimum roles needed in order to be able to create a new workspace"/>
          </template>
          <el-select v-model="edited.creationPrivilegedRoles"
                     multiple
                     filterable
                     allow-create
                     default-first-option
                     :reserve-keyword="false">
            <el-option :label="$t(`* ('All')`)" value="*"/>
            <el-option :label="$t(`admin`)" value="admin"/>
            <el-option :label="$t(`user`)" value="user"/>
          </el-select>
        </el-form-item>

        <el-form-item class="flex-1">
          <template #label>
            {{ $t('Privileged Workspace Roles to view members') }}
            <InfoIcon content="Define the minimum workspace roles needed in order view their workspace members"/>
          </template>
          <el-select v-model="edited.viewMembersPrivilegedWsRoles"
                     multiple
                     filterable
                     allow-create
                     default-first-option
                     :reserve-keyword="false">
            <el-option :label="$t(`* ('All')`)" value="*"/>
            <el-option :label="$t(`admin`)" value="admin"/>
            <el-option :label="$t(`member`)" value="member"/>
            <el-option :label="$t(`user`)" value="user"/>
          </el-select>
        </el-form-item>

      </FormRowGroup>
      <h3>{{ $t('Labels') }}</h3>
      <FormInput v-model="edited.allowNonLabeledWorkspaces" title="Allow to create workspaces without any labels"
                 type="switch"/>
      <FormRowGroup wrap v-for="(row, index) in edited.labels" :key="index">
        <FormInput v-model="row.title" title="Title" type="text" class="wide-input"/>
        <FormInput v-model="row.description" title="Description" type="text" class="wide-input"/>
        <LabelsInput title="Labels Values" v-model="row.value" class="wide-input" info="Labels to be attached to the workspace upon creation">
          <el-option :label="$t(`customer`)" value="customer"/>
          <el-option :label="$t(`supplier`)" value="supplier"/>
          <el-option :label="$t(`merchant`)" value="merchant"/>
        </LabelsInput>
        <LabelsInput title="Creator Roles" v-model="row.allowedRolesForCreation" class="wide-input" info="Only a user with these roles can create a workspace with this label">
          <el-option :label="$t(`* ('All')`)" value="*"/>
          <el-option :label="$t(`Admin`)" value="admin"/>
          <el-option :label="$t(`User`)" value="user"/>
        </LabelsInput>

        <div class="flex-0 remove-row">
          <RemoveButton @click="edited.labels.splice(index, 1)"/>
        </div>
      </FormRowGroup>
      <AddMore @click="edited.labels.push({title: '', description: '', value: [], allowedRolesForCreation: ['*']})"/>
      <SaveButton :submitting="submitting"/>
    </el-form>
    <CreateMyWorkspace v-if="!$isMobile" class="create-ws-demo flex-2" :ws-config="edited"/>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { useNotifications } from '@/modules/core/compositions/notifications';
import CreateMyWorkspace from '@/modules/workspaces/CreateMyWorkspace.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';

const props = defineProps({
  kind: String,
  metadata: Object as () => WorkspaceConfigurationMetadata,
  submitting: Boolean
})


const defaultMetadata: WorkspaceConfigurationMetadata = {
  isActive: false,
  creationPrivilegedRoles: [],
  viewMembersPrivilegedWsRoles: [],
  labels: [],
  allowNonLabeledWorkspaces: true
}

const edited = ref<WorkspaceConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

const notifications = useNotifications();
const { t: $t } = useI18n();


function save() {
  if (!edited.value.allowNonLabeledWorkspaces && !edited.value.labels.length) {
    notifications.error($t('At least one label must be defined'));
    return;
  }
  if (edited.value.labels.some(label => !label.title || !label.value.length)) {
    notifications.error($t('All labels must have a title and at least one value'));
    return;
  }
  emit('save', edited.value)
}
</script>
<style scoped>
.active-input {
  min-width: 80px;
}

.workspace-configuration-form {
  padding-inline-end: 10px;
}

.create-ws-demo {
  border: 4px solid var(--border-color);
  margin-inline-end: 10px;
  zoom: 0.5;
}

.wide-input {
  min-width: 300px;
}

</style>
