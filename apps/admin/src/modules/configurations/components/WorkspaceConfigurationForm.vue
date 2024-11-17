<template>
  <el-form @submit.native.prevent="save" class="workspace-configuration-form">
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
    <FormRowGroup v-for="(row, index) in edited.labels" :key="index">
      <FormInput v-model="row.title" title="Title" type="text"/>
      <FormInput v-model="row.description" title="Description" type="text"/>

      <el-form-item class="flex-1">
        <template #label>
          {{ $t('Labels Values') }}
        </template>
        <el-select v-model="row.value"
                   multiple
                   filterable
                   allow-create
                   default-first-option
                   :reserve-keyword="false">
          <el-option :label="$t(`customer`)" value="customer"/>
          <el-option :label="$t(`supplier`)" value="supplier"/>
          <el-option :label="$t(`merchant`)" value="merchant"/>
        </el-select>
      </el-form-item>
    </FormRowGroup>
    <AddMore @click="edited.labels.push({title: '', description: '', value: []})"/>
    <SaveButton :submitting="submitting"/>
  </el-form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';

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


function save() {
  emit('save', edited.value)
}
</script>
<style scoped>
.active-input {
  min-width: 80px;
}
</style>
