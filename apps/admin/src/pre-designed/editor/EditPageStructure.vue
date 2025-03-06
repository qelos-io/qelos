<script setup lang="ts">
import { provide, ref, toRef, watch } from 'vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IMicroFrontend } from '@/services/types/plugin';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import EditPageRequirements from '@/pre-designed/editor/EditPageRequirements.vue';

const emit = defineEmits(['save', 'close'])

const props = defineProps<{
  pageName: string,
  mfe: IMicroFrontend,
  submitting: boolean
}>()

provide('submitting', toRef(props, 'submitting'))

const openCodeSection = ref('html');

const htmlEditor = ref()

const editedSettings = ref<Partial<IMicroFrontend> & { roles: string[] }>({
  roles: [],
  workspaceRoles: [],
  workspaceLabels: [],
})

const editedRequirements = ref<any[]>();

watch(() => props.mfe, (mfe) => {
  if (!props.mfe) {
    return;
  }
  editedRequirements.value = props.mfe.requirements.map(req => {
    return {
      ...req,
      _id: undefined,
    }
  })
  editedSettings.value = {
    active: mfe.active,
    roles: typeof mfe.roles === 'string' ? mfe.roles.split(',') : (mfe.roles || []),
    workspaceRoles: mfe.workspaceRoles,
    workspaceLabels: mfe.workspaceLabels,
    route: mfe.route,
    searchPlaceholder: mfe.searchPlaceholder,
    searchQuery: mfe.searchQuery,
  }
}, { immediate: true })


function save() {
  emit('save', {
    settings: editedSettings.value,
    structure: props.mfe.structure,
    requirements: editedRequirements.value
  });
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
          <EditPageRequirements v-model="editedRequirements"/>
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
                v-model="editedSettings.workspaceRoles"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
            >
              <template v-for="role in props.mfe.workspaceRoles">
                <el-option v-if="role !== '*'" :key="role" :label="role" :value="role"/>
              </template>
              <el-option label="All (*)" value="*"/>
            </el-select>
          </el-form-item>
          <LabelsInput title="Workspace Labels" v-model="editedSettings.workspaceLabels"/>
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