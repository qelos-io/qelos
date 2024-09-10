<script setup lang="ts">

import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import { provide, ref, toRef, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IMicroFrontend } from '@/services/types/plugin';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';

const emit = defineEmits(['save', 'close'])

const props = defineProps<{
  pageName: string,
  mfe: IMicroFrontend,
  submitting: boolean
}>()

provide('submitting', toRef(props, 'submitting'))

const openCodeSection = ref('html');

const editedRequirements = ref('[]')
const editedRequirementsObj = ref([])
const htmlEditor = ref()
const requirementsEditor = ref()
const editorMode = ref(true)

const editedSettings = ref<Partial<IMicroFrontend> & { roles: string[] }>({
  roles: []
})

const requirementsColumns = [
  {
    prop: 'key',
    label: 'Key',
  },
  {
    prop: 'type',
    label: 'Type',
  },
  {
    prop: 'details',
    label: 'Details',
  }]

watch(() => props.mfe, (mfe) => {
  if (!props.mfe) {
    return;
  }
  editedRequirements.value = JSON.stringify(props.mfe.requirements.map(req => {
    return {
      ...req,
      _id: undefined,
    }
  }), null, 2);
  editedRequirementsObj.value = JSON.parse(editedRequirements.value);

  editedSettings.value = {
    active: mfe.active,
    roles: typeof mfe.roles === 'string' ? mfe.roles.split(',') : (mfe.roles || []),
    workspaceRoles: mfe.workspaceRoles,
    route: mfe.route,
    searchPlaceholder: mfe.searchPlaceholder,
    searchQuery: mfe.searchQuery,
  }
}, { immediate: true })

watch(editedRequirementsObj, () => {
  editedRequirements.value = JSON.stringify(editedRequirementsObj.value, null, 2)
}, { deep: true })

function toggleEditorMode() {
  editorMode.value = !editorMode.value;
  if (editorMode.value) {
    editedRequirements.value = JSON.stringify(editedRequirementsObj.value, null, 2)
  } else {
    editedRequirementsObj.value = JSON.parse(editedRequirements.value)
  }
}

function save() {
  emit('save', {
    settings: editedSettings.value,
    structure: props.mfe.structure,
    requirements: JSON.parse(editedRequirements.value)
  });
}

function getRowType(row: any) {
  if (row.fromBlueprint) {
    return 'fromBlueprint';
  }
  if (row.fromCrud) {
    return 'fromCrud';
  }
  if (row.fromData) {
    return 'fromData';
  }
  if (row.fromHTTP) {
    return 'fromHTTP';
  }
}

function updateRowType(row: any, type: string) {
  const data = row[getRowType(row)];
  delete row[getRowType(row)]

  row[type] = data;
}

function addRequirement() {
  editedRequirementsObj.value.push({
    key: '',
    fromBlueprint: {
      name: ''
    },
  })
}

function json(obj: any) {
  return JSON.stringify(obj, null, 2)
}

function updateRowJSON(row: any, key: string, value: string) {
  try {
    row[key] = JSON.parse(value);
  } catch {
    //
  }
}

provide('editableManager', ref(false));
</script>

<template>
  <el-form @submit.prevent="save" class="form">
    <EditHeader>
      {{ $t('Edit Screen') }}<strong>{{ pageName }}</strong>
      <template #buttons>
        <el-button @click="$emit('close')">Close</el-button>
      </template>
    </EditHeader>
    <el-tabs class="flex-1" v-if="mfe" accordion v-model="openCodeSection">
      <el-tab-pane name="html" :label="$t('HTML')">
        <Monaco v-if="openCodeSection === 'html'"
                ref="htmlEditor"
                v-model="mfe.structure"
                language="html"
                style="min-height:65vh"/>
      </el-tab-pane>
      <el-tab-pane name="requirements" :label="$t('Requirements')">
        <div class="tab-content" v-if="openCodeSection === 'requirements'">
          <el-button-group>
            <el-button @click="toggleEditorMode">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'code']"/>
              </el-icon>
              <span>{{ $t('Toggle Code Editor') }}</span>
            </el-button>
            <el-button @click="addRequirement">{{ $t('Add Requirement') }}</el-button>
          </el-button-group>
          <Monaco v-if="editorMode" ref="requirementsEditor"
                  v-model="editedRequirements"
                  language="json"
                  style="min-height:65vh"/>
          <div v-else class="flex-1">
            <QuickTable :data="editedRequirementsObj" :columns="requirementsColumns">
              <template #key="{row}">
                <FormRowGroup>
                  <RemoveButton class="flex-0"
                                @click="editedRequirementsObj.splice(editedRequirementsObj.indexOf(row), 1)"/>
                  <el-input required v-model="row.key"/>
                </FormRowGroup>
              </template>
              <template #type="{row}" style="width: 100px;">
                <el-select :model-value="getRowType(row)" @update:model-value="updateRowType(row, $event)">
                  <el-option value="fromBlueprint" :label="$t('Blueprint')"/>
                  <el-option value="fromCrud" :label="$t('CRUD')"/>
                  <el-option value="fromData" :label="$t('Data')"/>
                  <el-option value="fromHTTP" :label="$t('HTTP')"/>
                </el-select>
              </template>
              <template #details="{row}">
                <Monaco v-if="row.fromBlueprint" :model-value="json(row.fromBlueprint)"
                        style="max-height:80px;"
                        @update:model-value="updateRowJSON(row, 'fromBlueprint', $event)"/>
                <Monaco v-if="row.fromCrud" :model-value="json(row.fromCrud)"
                        style="max-height:80px;"
                        @update:model-value="updateRowJSON(row, 'fromCrud', $event)"/>
                <Monaco v-if="row.fromData" :model-value="json(row.fromData)"
                        style="max-height:300px;"
                        @update:model-value="updateRowJSON(row, 'fromData', $event)"/>
                <Monaco v-if="row.fromHTTP" :model-value="json(row.fromHTTP)"
                        style="max-height:100px;"
                        @update:model-value="updateRowJSON(row, 'fromHTTP', $event)"/>
              </template>
            </QuickTable>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane name="settings" :label="$t('Settings')">
        <FormInput type="switch" v-model="editedSettings.active" :title="$t('Active?')"/>

        <FormRowGroup>
          <el-form-item>
            <template #label>
              {{ $t('Roles') }}
              <InfoIcon content="Only specified roles will be able to access this page"/>
            </template>
            <el-select
                v-model="editedSettings.roles"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
            >
              <template v-for="role in props.mfe.roles">
                <el-option v-if="role !== '*'" :key="role" :label="role" :value="role"/>
              </template>
              <el-option label="All (*)" value="*"/>
            </el-select>
          </el-form-item>
          <el-form-item>
            <template #label>
              {{ $t('Workspace Roles') }}
              <InfoIcon content="Only specified workspace roles will be able to access this page"/>
            </template>
            <el-select
                v-model="editedSettings.roles"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
            >
              <template v-for="role in props.mfe.roles">
                <el-option v-if="role !== '*'" :key="role" :label="role" :value="role"/>
              </template>
              <el-option label="All (*)" value="*"/>
            </el-select>
          </el-form-item>
        </FormRowGroup>

        <FormRowGroup>
          <FormInput type="switch" class="flex-0" v-model="editedSettings.searchQuery" :title="$t('Search')"/>
          <FormInput v-model="editedSettings.searchPlaceholder" :title="$t('Search Placeholder')"/>
        </FormRowGroup>
      </el-tab-pane>
    </el-tabs>
  </el-form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
}

.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
</style>