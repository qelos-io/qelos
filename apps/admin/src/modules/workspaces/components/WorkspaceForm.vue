<template>
  <div class="workspace-form-container">
    <el-form @submit.native.prevent="submit" class="workspace-form" :model="data" :rules="rules" ref="formRef">
      <el-card class="workspace-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>{{ workspace._id ? $t('Edit Workspace') : $t('Create Your Workspace') }}</h2>
            <p v-if="!workspace._id" class="subtitle">{{ $t('Set up a new workspace for your team') }}</p>
          </div>
        </template>
        
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
              :key="option.value"
              class="workspace-type-option"
              :class="{ 'selected': selectedLabels === option }"
              @click="selectedLabels = option"
            >
              <div class="type-icon">
                <font-awesome-icon :icon="['fas', option.icon || 'building']" />
              </div>
              <div class="type-content">
                <h4>{{ option.title }}</h4>
                <p v-if="option.description">{{ option.description }}</p>
              </div>
              <div class="type-check">
                <el-radio :model-value="selectedLabels === option ? true : false" :label="true" />
              </div>
            </div>
          </div>
        </div>

        <div class="section invite-members">
          <h3>{{ $t('Invite Team Members') }}</h3>
          <p class="description">{{ $t('Add people to your workspace by email') }}</p>
          
          <div class="invites-list">
            <el-empty 
              v-if="data.invites.length === 0" 
              :description="$t('No invites added yet')"
              :image-size="100"
            >
              <template #extra>
                <el-button type="primary" @click="addItem">
                  <font-awesome-icon :icon="['fas', 'user-plus']" class="icon-left" />
                  {{ $t('Add First Member') }}
                </el-button>
              </template>
            </el-empty>
            
            <div v-else>
              <el-table :data="data.invites" style="width: 100%" class="invites-table">
                <el-table-column prop="name" :label="$t('Name')" min-width="180">
                  <template #default="{ row, $index }">
                    <el-input 
                      v-model="row.name" 
                      :placeholder="$t('Enter name')"
                      size="default"
                    />
                  </template>
                </el-table-column>
                
                <el-table-column prop="email" :label="$t('Email')" min-width="220">
                  <template #default="{ row, $index }">
                    <el-input 
                      v-model="row.email" 
                      :placeholder="$t('Enter email address')"
                      type="email"
                      size="default"
                    />
                  </template>
                </el-table-column>
                
                <el-table-column width="80">
                  <template #default="{ $index }">
                    <el-button 
                      type="danger" 
                      circle 
                      @click="removeItem($index)"
                      size="small"
                    >
                      <font-awesome-icon :icon="['fas', 'trash']" />
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="invites-actions">
                <el-button @click="addItem" type="success" plain size="default">
                  <font-awesome-icon :icon="['fas', 'user-plus']" class="icon-left" />
                  {{ $t('Add Another Member') }}
                </el-button>
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
      </el-card>
    </el-form>

    <el-card class="members-card" v-if="workspace._id && members" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>{{ $t('Workspace Members') }}</h3>
          <p class="subtitle">{{ $t('People with access to this workspace') }}</p>
        </div>
      </template>
      
      <div class="members-list">
        <el-empty v-if="!members.length" :description="$t('No members in this workspace yet')" />
        <QuickTable v-else :data="members" :columns="membersColumns">
          <template #lastName="{ row }">
            {{ decodeURIComponent(row.lastName) }}
          </template>
          <template #firstName="{ row }">
            {{ decodeURIComponent(row.firstName) }}
          </template>
        </QuickTable>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, PropType, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';

import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { useWorkspaceMembers } from '@/modules/workspaces/compositions/workspaces';

import { WorkspaceConfigurationMetadata, WorkspaceLabelDefinition } from '@qelos/global-types';
import { ElNotification } from 'element-plus';
import { useAuth } from '@/modules/core/compositions/authentication';
const router = useRouter();
const formRef = ref(null);

const membersColumns = [
  { label: 'First Name', prop: 'firstName' },
  { label: 'Last Name', prop: 'lastName' },
  { label: 'Email', prop: 'email' },
  { label: 'Roles', prop: 'roles', type: 'tags' },
];

const { workspace, wsConfig } = defineProps({
  submitting: Boolean,
  workspace: {
    type: Object as PropType<any>,
    default: () => ({})
  },
  wsConfig: Object as PropType<WorkspaceConfigurationMetadata>,
});

const emit = defineEmits(['submitted']);

const { user } = useAuth();

const filteredLabels = computed(() => wsConfig.labels?.filter(l => !l.allowedRolesForCreation ||
    l.allowedRolesForCreation.includes('*') ||
    l.allowedRolesForCreation.some(r => user.value.roles.includes(r))
) || []);

const { load: loadMembers, members } = useWorkspaceMembers(workspace._id);
const selectedLabels = ref<WorkspaceLabelDefinition>();

// Form validation rules
const rules = {
  name: [
    { required: true, message: 'Please enter a workspace name', trigger: 'blur' }
  ]
};

if (workspace._id) {
  loadMembers();
} else {
  selectedLabels.value = filteredLabels.value[0];
}

const data = reactive<Partial<IWorkspace>>({
  name: workspace.name || null,
  logo: workspace.logo || null,
  invites: workspace.invites || [],
  labels: workspace.labels || [],
});

// If no invites are present and we're creating a new workspace, show empty state
if (!workspace._id && (!data.invites || data.invites.length === 0)) {
  data.invites = [];
}

function submit() {
  if (formRef.value) {
    formRef.value.validate(async (valid) => {
      if (!valid) {
        ElNotification.warning('Please fill in all required fields');
        return;
      }
      
      if (!workspace._id) {
        let labels = selectedLabels.value?.value || [];
        if (filteredLabels.value.length === 1) {
          labels = filteredLabels.value[0].value;
        }
        if (labels.length) {
          data.labels = labels;
        }
        if (data.labels.length === 0 && !wsConfig.allowNonLabeledWorkspaces) {
          ElNotification.error('Please select a workspace type');
          return;
        }
      }
      
      // Filter out empty invites
      if (data.invites && data.invites.length > 0) {
        data.invites = data.invites.filter(invite => invite.email && invite.email.trim() !== '');
      }
      
      emit('submitted', clearNulls(data));
    });
  } else {
    // Fallback if form ref is not available
    emit('submitted', clearNulls(data));
  }
}

function addItem() {
  data.invites.push({
    name: null,
    email: null,
  });
}

function removeItem(index) {
  data.invites.splice(index, 1);
}

function cancel() {
  router.back();
}
</script>

<style scoped>
.workspace-form-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.workspace-card,
.members-card {
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

.card-header h3 {
  margin: 0;
  font-size: 1.3rem;
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

.invites-list {
  margin-top: 15px;
}

.invites-table {
  margin-bottom: 15px;
}

.invites-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 15px;
}

.icon-left {
  margin-right: 5px;
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

.members-list {
  margin-top: 15px;
}

@media (max-width: 768px) {
  .workspace-form-container {
    padding: 10px;
  }
  
  .workspace-types-grid {
    grid-template-columns: 1fr;
  }
}
</style>
