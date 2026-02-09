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
    <el-card class="user-form-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>{{$t('User Information')}}</span>
        </div>
      </template>

      <div class="form-section">
        <!-- Profile Image -->
        <el-form-item :label="$t('Profile Image')" class="form-item">
          <div class="profile-image-section">
            <!-- URL Input -->
            <el-input 
              v-model="editedData.profileImage" 
              :placeholder="$t('Enter image URL or upload file')"
              clearable
            >
              <template #prepend>
                <font-awesome-icon :icon="['fas', 'link']" />
              </template>
            </el-input>
            
            <!-- File Upload -->
            <div class="file-upload-row">
              <FormInput type="file" v-model="editedData.profileImageFile" :upload-config="{ isImage: true }" />
              <el-button 
                v-if="editedData.profileImageFile" 
                type="primary" 
                size="small"
                @click="uploadFile"
                :loading="uploading"
              >
                {{ $t('Upload') }}
              </el-button>
            </div>
            
            <!-- Image Preview -->
            <div v-if="editedData.profileImage" class="image-preview">
              <img :src="editedData.profileImage" alt="Profile preview" />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeImage"
              >
                {{ $t('Remove') }}
              </el-button>
            </div>
          </div>
        </el-form-item>

        <div class="form-row">
          <el-form-item :label="$t('First Name')" prop="firstName" class="form-item">
            <el-input 
              v-model="editedData.firstName" 
              :placeholder="$t('Enter first name')"
              :prefix-icon="UserFilled"
              clearable
            />
          </el-form-item>

          <el-form-item :label="$t('Last Name')" prop="lastName" class="form-item">
            <el-input 
              v-model="editedData.lastName" 
              :placeholder="$t('Enter last name')"
              :prefix-icon="UserFilled"
              clearable
            />
          </el-form-item>
        </div>

        <el-form-item :label="$t('Username / Email')" prop="username" class="form-item">
          <el-input 
            v-model="editedData.username" 
            :placeholder="$t('Enter email address')"
            :disabled="!asAdmin"
            :prefix-icon="Message"
            clearable
          />
        </el-form-item>

        <el-form-item :label="$t('Password')" prop="password" class="form-item">
          <el-input 
            v-model="editedData.password" 
            type="password"
            :placeholder="$t('Enter new password')"
            :prefix-icon="Lock"
            show-password
          >
            <template #append>
              <el-tooltip :content="$t('Leave empty to keep current password')" placement="top">
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
          <el-collapse-item :title="$t('Advanced: Metadata')" name="metadata">
            <el-form-item prop="internalMetadata" class="form-item">
              <Monaco 
                :model-value="editedData.internalMetadata" 
                @input="editedData.internalMetadata = $event.target.value"
                height="200px"
              />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>

        <div class="form-actions">
          <el-button @click="resetForm" :disabled="submitting">
            {{ $t('Reset') }}
          </el-button>
          <el-button 
            type="primary" 
            @click="validateAndSubmit" 
            :loading="submitting"
            :icon="Check"
          >
            {{ $t('Save Changes') }}
          </el-button>
        </div>
      </div>
    </el-card>
  </el-form>
</template>
<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'
import { clearNulls } from '../../core/utils/clear-nulls'
import { useEditedInputs } from '../../core/compositions/edited-inputs'
import { IUser } from '../../core/store/types/user';
import Monaco from './Monaco.vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, UserFilled, Message, Lock, Check, InfoFilled } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const formRef = ref<FormInstance>();
const { t } = useI18n()

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
    { required: true, message: t('First name is required'), trigger: 'blur' },
    { min: 2, max: 50, message: t('Length should be 2 to 50 characters'), trigger: 'blur' }
  ],
  lastName: [
    { required: true, message: t('Last name is required'), trigger: 'blur' },
    { min: 2, max: 50, message: t('Length should be 2 to 50 characters'), trigger: 'blur' }
  ],
  username: [
    { required: true, message: t('Email is required'), trigger: 'blur' },
    { type: 'email', message: t('Please enter a valid email address'), trigger: 'blur' }
  ],
  password: [
    { min: 8, message: t('Password must be at least 8 characters'), trigger: 'blur' }
  ]
});

const editedData = reactive({
  firstName: props.user?.firstName ? decodeURIComponent(  props.user?.firstName) : null,
  lastName: props.user?.lastName ? decodeURIComponent(props.user?.lastName) : null,
  username: props.user?.username || null,
  password: null,
  roles: props.user && props.user._id ? null : ['user'],
  internalMetadata: '{}',
  profileImage: props.user?.profileImage || '',
  profileImageFile: null
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
  username
} = useEditedInputs(editedData, props.user, ['firstName', 'lastName', 'username'])

async function validateAndSubmit() {
  if (!formRef.value) return;
  
  try {
    await formRef.value?.validate();
    submit();
  } catch (error) {
    ElMessage.error(t('Please correct the form errors before submitting'));
  }
}

function submit() {
  try {
    // Create a copy of the data to avoid modifying the reactive object
    const dataToSubmit = { ...editedData };
    
    if (dataToSubmit.internalMetadata) {
      dataToSubmit.internalMetadata = JSON.parse(dataToSubmit.internalMetadata);
    }
    
    emit('submitted', clearNulls(dataToSubmit));
  } catch (error) {
    ElMessage.error(t('Error in metadata format. Please check the JSON syntax.'));
  }
}

function resetForm() {
  formRef.value?.resetFields();
  ElMessage.info(t('Form has been reset'));
}

const uploading = ref(false);

async function uploadFile() {
  if (!editedData.profileImageFile) {
    ElMessage.error(t('Please select a file to upload'));
    return;
  }
  
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', editedData.profileImageFile);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      editedData.profileImage = result.url;
      editedData.profileImageFile = null;
      ElMessage.success(t('Image uploaded successfully'));
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    ElMessage.error(t('Failed to upload image'));
  } finally {
    uploading.value = false;
  }
}

function removeImage() {
  editedData.profileImage = '';
  editedData.profileImageFile = null;
}

// Watch for user data changes to handle internalMetadata conversion
watch(() => props.user, (newUser) => {
  if (newUser) {
    // Handle profile image
    if (newUser.profileImage !== undefined) {
      editedData.profileImage = newUser.profileImage || '';
    }
    
    // Always ensure internalMetadata is a string
    if (newUser.internalMetadata) {
      if (typeof newUser.internalMetadata === 'object') {
        editedData.internalMetadata = JSON.stringify(newUser.internalMetadata, null, 2);
      } else if (typeof newUser.internalMetadata === 'string') {
        editedData.internalMetadata = newUser.internalMetadata;
      } else {
        editedData.internalMetadata = '{}';
      }
    } else {
      editedData.internalMetadata = '{}';
    }
  }
}, { immediate: true, deep: true });
</script>

<style scoped>
.user-form {
  width: 100%;
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

.profile-image-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.file-upload-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.file-upload-row .form-input {
  flex: 1;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.image-preview img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
}

/* Responsive design */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .file-upload-row {
    flex-direction: column;
  }
  
  .image-preview {
    flex-direction: column;
    text-align: center;
  }
}
</style>
