<template>
  <el-form 
    ref="formRef" 
    :model="editedData" 
    :rules="rules" 
    @submit.native.prevent="validateAndSubmit" 
    class="user-form" 
    label-position="top"
    status-icon
  >
    <EditHeader class="user-form-header">
      <slot/>
    </EditHeader>

    <el-card class="user-form-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>User Information</span>
        </div>
      </template>

      <div class="form-section">
        <div class="form-row">
          <el-form-item label="First Name" prop="firstName" class="form-item">
            <el-input 
              v-model="editedData.firstName" 
              placeholder="Enter first name"
              :prefix-icon="UserFilled"
              clearable
            />
          </el-form-item>

          <el-form-item label="Last Name" prop="lastName" class="form-item">
            <el-input 
              v-model="editedData.lastName" 
              placeholder="Enter last name"
              :prefix-icon="UserFilled"
              clearable
            />
          </el-form-item>
        </div>

        <el-form-item label="Username / Email" prop="username" class="form-item">
          <el-input 
            v-model="editedData.username" 
            placeholder="Enter email address"
            :disabled="!asAdmin"
            :prefix-icon="Message"
            clearable
          />
        </el-form-item>

        <el-form-item label="Password" prop="password" class="form-item">
          <el-input 
            v-model="editedData.password" 
            type="password"
            placeholder="Enter new password"
            :prefix-icon="Lock"
            show-password
          >
            <template #append>
              <el-tooltip content="Leave empty to keep current password" placement="top">
                <el-icon><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="!hideRoles" prop="roles" class="form-item">
          <LabelsInput 
            style="min-width: 50%;"
            v-model="roles" 
            title="Roles" 
          >
            <el-option v-for="role in availableRoles" :key="role" :label="role" :value="role" />
          </LabelsInput>
        </el-form-item>

        <el-collapse v-if="asAdmin" class="metadata-section">
          <el-collapse-item title="Advanced: Metadata" name="metadata">
            <el-form-item prop="internalMetadata" class="form-item">
              <Monaco 
                :model-value="internalMetadata" 
                @input="editedData.internalMetadata = $event.target.value"
                height="200px"
              />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>

        <div class="form-actions">
          <el-button @click="resetForm" :disabled="submitting">
            Reset
          </el-button>
          <el-button 
            type="primary" 
            @click="validateAndSubmit" 
            :loading="submitting"
            :icon="Check"
          >
            Save Changes
          </el-button>
        </div>
      </div>
    </el-card>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { clearNulls } from '../../core/utils/clear-nulls'
import { useEditedInputs } from '../../core/compositions/edited-inputs'
import { IUser } from '../../core/store/types/user';
import Monaco from './Monaco.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, UserFilled, Message, Lock, Check, InfoFilled } from '@element-plus/icons-vue';

const formRef = ref<FormInstance>();

const props = defineProps({
  user: Object as () => IUser,
  hideRoles: Boolean,
  submitting: Boolean,
  asAdmin: Boolean
})
const emit = defineEmits(['submitted']);

// Form validation rules
const rules = reactive<FormRules>({
  firstName: [
    { required: true, message: 'First name is required', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ],
  lastName: [
    { required: true, message: 'Last name is required', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ],
  username: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' }
  ],
  password: [
    { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' }
  ]
});

const editedData = reactive({
  firstName: props.user?.firstName ? decodeURIComponent(  props.user?.firstName) : null,
  lastName: props.user?.lastName ? decodeURIComponent(props.user?.lastName) : null,
  username: props.user?.username || null,
  password: null,
  roles: props.user && props.user._id ? null : ['user'],
  internalMetadata: props.user?.internalMetadata ? JSON.stringify(props.user.internalMetadata, null, 2) : '{}'
});

let roles;
let availableRoles;

if (!props.hideRoles) {
  roles = computed<Array<string>>({
    get: () => editedData.roles || props.user?.roles || [],
    set: (roles) => editedData.roles = roles
  });
  availableRoles = Array.from(new Set(['admin', 'editor', 'plugin', 'user'].concat(props.user?.roles || [])));
}

const {
  firstName,
  lastName,
  username,
  internalMetadata
} = useEditedInputs(editedData, props.user, ['firstName', 'lastName', 'username', 'internalMetadata'])

async function validateAndSubmit() {
  if (!formRef.value) return;
  
  try {
    await formRef.value?.validate();
    submit();
  } catch (error) {
    ElMessage.error('Please correct the form errors before submitting');
  }
}

function submit() {
  try {
    if (editedData.internalMetadata) {
      editedData.internalMetadata = JSON.parse(editedData.internalMetadata);
    }
    emit('submitted', clearNulls(editedData));
    ElMessage.success('User information saved successfully');
  } catch (error) {
    ElMessage.error('Error in metadata format. Please check the JSON syntax.');
  }
}

function resetForm() {
  formRef.value?.resetFields();
  ElMessage.info('Form has been reset');
}
</script>

<style scoped>
.user-form {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.user-form-header {
  margin-bottom: 20px;
}

.user-form-card {
  margin-bottom: 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.form-section {
  padding: 10px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.form-item {
  width: 100%;
  margin-bottom: 20px;
}

.metadata-section {
  margin: 20px 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}

/* Responsive design */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .user-form {
    padding: 10px;
  }
}
</style>
