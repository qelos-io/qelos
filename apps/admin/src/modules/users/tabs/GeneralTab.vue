<template>
  <div class="general-tab">
    <el-card class="general-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>{{ $t('User Information') }}</span>
        </div>
      </template>

      <el-form 
        ref="formRef" 
        :model="editedData" 
        :rules="rules" 
        @submit.native.prevent="validateAndSubmit" 
        class="user-form" 
        label-position="top"
        status-icon
      >
        <div class="form-section">
          <!-- Profile Image Upload -->
          <FormInput type="file" v-model="editedData.profileImage" />

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
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'
import { clearNulls } from '@/modules/core/utils/clear-nulls'
import { IUser } from '@/modules/core/store/types/user';
import { ElMessage, FormInstance, FormRules, UploadProps } from 'element-plus';
import { User, UserFilled, Message, Lock, Check, InfoFilled, Plus } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/modules/core/compositions/authentication';
import { updateProfile } from '@/modules/core/store/auth';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import FormInput from '@/modules/core/components/forms/FormInput.vue';

const props = defineProps({
  user: Object as () => IUser,
  submitting: Boolean
});

const emit = defineEmits(['submitted']);
const { t } = useI18n();
const { user: authUser } = useAuth();

const { submit: submitProfile, submitting } = useSubmitting((payload) => updateProfile(payload), {
  success: 'Your profile has been updated.',
  error: 'Failed to update your profile'
});

const formRef = ref<FormInstance>();
const asAdmin = computed(() => authUser.value?.roles.includes('admin'));

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
  firstName: props.user?.firstName ? decodeURIComponent(props.user?.firstName) : null,
  lastName: props.user?.lastName ? decodeURIComponent(props.user?.lastName) : null,
  username: props.user?.username || null,
  password: null,
  profileImage: props.user?.profileImage || null
});

async function validateAndSubmit() {
  if (!formRef.value) return;
  
  try {
    await formRef.value?.validate();
    submitForm();
  } catch (error) {
    ElMessage.error(t('Please correct the form errors before submitting'));
  }
}

function submitForm() {
  emit('submitted', clearNulls(editedData));
}

function resetForm() {
  formRef.value?.resetFields();
  ElMessage.info(t('Form has been reset'));
}

// Watch for user prop changes to update form data
watch(() => props.user, (newUser) => {
  if (newUser) {
    editedData.firstName = newUser.firstName ? decodeURIComponent(newUser.firstName) : null;
    editedData.lastName = newUser.lastName ? decodeURIComponent(newUser.lastName) : null;
    editedData.username = newUser.username || null;
    editedData.password = null;
    editedData.profileImage = newUser.profileImage || null;
  }
}, { immediate: true });
</script>

<style scoped>
.general-card {
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

.profile-image-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.current-image {
  position: relative;
  display: inline-block;
}

.current-image img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--el-border-color);
}

.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(20px, -10px);
}

.avatar-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
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
}
</style>
