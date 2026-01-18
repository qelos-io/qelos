<template>
  <div class="general-tab">
    <el-card class="workspace-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('General Settings') }}</h2>
          <p class="subtitle">{{ $t('Manage your workspace basics') }}</p>
        </div>
      </template>
      
      <el-form @submit.native.prevent="submit" class="workspace-form" :model="data" :rules="rules" ref="formRef">
        <div class="section workspace-details">
          <h3>{{ $t('Workspace Details') }}</h3>
          <div class="workspace-info">
            <div class="workspace-name-section">
              <FormInput 
                title="Workspace Name" 
                v-model="data.name" 
                required 
                :placeholder="$t('Enter workspace name')"
                class="workspace-name"
              />
            </div>
            
            <div v-if="wsConfig.allowLogo" class="workspace-logo-section">
              <FormInput 
                title="Workspace Logo" 
                v-model="data.logo" 
                type="upload" 
                :placeholder="$t('Upload a logo')"
              />
              <div class="logo-preview" v-if="data.logo">
                <img :src="data.logo" alt="Workspace Logo" />
              </div>
            </div>
          </div>
        </div>

        <div class="section workspace-type" v-if="!workspace._id && filteredLabels.length > 1">
          <h3>{{ $t(wsConfig.labelsSelectorTitle || 'Select your workspace type') }}</h3>
          <p class="description">{{ $t('Choose the type that best fits your needs') }}</p>
          
          <div class="workspace-types-grid">
            <div 
              v-for="option of filteredLabels" 
              :key="option.title"
              class="workspace-type-option"
              :class="{ 'selected': selectedLabels?.value === option.value }"
              @click="selectedLabels = option"
            >
              <div class="type-icon">
                <font-awesome-icon :icon="['fas', 'building']" />
              </div>
              <div class="type-content">
                <h4>{{ option.title }}</h4>
                <p v-if="option.description">{{ option.description }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <el-button @click="cancel" plain>{{ $t('Cancel') }}</el-button>
          <SaveButton :submitting="submitting" type="primary" class="submit-button">
            {{ workspace._id ? $t('Update Workspace') : $t('Create Workspace') }}
          </SaveButton>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, PropType, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';

import { IWorkspace } from '@qelos/sdk/workspaces';
import { WorkspaceConfigurationMetadata, WorkspaceLabelDefinition } from '@qelos/global-types';
import { ElNotification } from 'element-plus';
import { useAuth } from '@/modules/core/compositions/authentication';

const props = defineProps({
  submitting: Boolean,
  workspace: {
    type: Object as PropType<any>,
    default: () => ({})
  },
  wsConfig: Object as PropType<WorkspaceConfigurationMetadata>,
});

const emit = defineEmits(['submitted']);

const router = useRouter();
const formRef = ref(null);
const { user } = useAuth();

const filteredLabels = computed(() => props.wsConfig.labels?.filter(l => !l.allowedRolesForCreation ||
    l.allowedRolesForCreation.includes('*') ||
    l.allowedRolesForCreation.some(r => user.value.roles.includes(r))
) || []);

const selectedLabels = ref<WorkspaceLabelDefinition>();

// Form validation rules
const rules = {
  name: [
    { required: true, message: 'Please enter a workspace name', trigger: 'blur' }
  ]
};

if (!props.workspace._id) {
  selectedLabels.value = filteredLabels.value[0];
}

const data = reactive<Partial<IWorkspace>>({
  name: props.workspace.name || null,
  logo: props.workspace.logo || null,
  labels: props.workspace.labels || [],
});

function submit() {
  if (formRef.value) {
    formRef.value.validate(async (valid) => {
      if (!valid) {
        ElNotification.warning({
          title: 'Validation Error',
          message: 'Please fill in all required fields',
          duration: 3000
        });
        return;
      }
      
      if (!props.workspace._id) {
        let labels = selectedLabels.value?.value || [];
        if (filteredLabels.value.length === 1) {
          labels = filteredLabels.value[0].value;
        }
        if (labels.length) {
          data.labels = labels;
        }
        if (data.labels.length === 0 && !props.wsConfig.allowNonLabeledWorkspaces) {
          ElNotification.error({
            title: 'Validation Error',
            message: 'Please select a workspace type',
            duration: 3000
          });
          return;
        }
      }
      
      emit('submitted', clearNulls(data));
    });
  } else {
    // Fallback if form ref is not available
    emit('submitted', clearNulls(data));
  }
}

function cancel() {
  router.back();
}
</script>

<style scoped>
.workspace-card {
  margin-bottom: 30px;
  border-radius: 8px;
}

.card-header {
  margin-bottom: 10px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section h3 {
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 500;
}

.description {
  margin: 0 0 20px;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.workspace-info {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.workspace-name-section {
  flex: 1;
  min-width: 300px;
}

.workspace-logo-section {
  flex: 1;
  min-width: 300px;
}

.logo-preview {
  margin-top: 10px;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.workspace-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.workspace-type-option {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.workspace-type-option:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.workspace-type-option.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.type-icon {
  font-size: 1.5rem;
  color: var(--el-color-primary);
  margin-right: 15px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-color-primary-light-8);
  border-radius: 50%;
}

.type-content {
  flex: 1;
}

.type-content h4 {
  margin: 0 0 5px;
  font-size: 1rem;
}

.type-content p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}

.submit-button {
  min-width: 150px;
}

@media (max-width: 768px) {
  .workspace-types-grid {
    grid-template-columns: 1fr;
  }
}
</style>
