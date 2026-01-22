<template>
  <div class="flex-row">
    <div class="form-wrapper flex-2">
      <el-form @submit.native.prevent="save" class="auth-configuration-form">
        <div class="form-content">
          <GeneralSettingsSection
            v-model:show-login-page="edited.showLoginPage"
            v-model:show-register-page="edited.showRegisterPage"
            v-model:treat-username-as="edited.treatUsernameAs"
            v-model:form-position="edited.formPosition"
          />

          <LoginPageAppearanceSection
            v-model:background-image="edited.backgroundImage"
            v-model:vertical-background-image="edited.verticalBackgroundImage"
            v-model:login-title="edited.loginTitle"
            v-model:slots="edited.slots"
            :form-position="edited.formPosition"
          />

          <AuthenticationMethodsSection
            v-model:disable-username-password="edited.disableUsernamePassword"
            v-model:allow-social-auto-registration="edited.allowSocialAutoRegistration"
            v-model:social-logins-sources="edited.socialLoginsSources"
            :sourced-loaded="sourcedLoaded"
            :linked-in-sources="linkedInSources"
            :facebook-sources="facebookSources"
            :google-sources="googleSources"
            :github-sources="githubSources"
          />

          <AdditionalUserFieldsSection
            v-model:additional-user-fields="edited.additionalUserFields"
          />
        </div>

        <div class="form-actions">
          <SaveButton :submitting="submitting" />
        </div>
      </el-form>
    </div>
    
    <!-- Live Preview -->
    <div class="preview-container flex-1" v-if="!$isMobile">
      <div class="preview-header">{{ $t('Live Preview') }}</div>
      <Login class="login-demo" :auth-config="edited"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, watch } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { IAuthConfigurationMetadata, IntegrationSourceKind } from '@qelos/global-types';
import Login from '@/modules/core/Login.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';
import GeneralSettingsSection from './auth-config-form/GeneralSettingsSection.vue';
import LoginPageAppearanceSection from './auth-config-form/LoginPageAppearanceSection.vue';
import AuthenticationMethodsSection from './auth-config-form/AuthenticationMethodsSection.vue';
import AdditionalUserFieldsSection from './auth-config-form/AdditionalUserFieldsSection.vue';

const props = defineProps({
  kind: String,
  metadata: Object as () => IAuthConfigurationMetadata,
  submitting: Boolean
})

const defaultMetadata: IAuthConfigurationMetadata = {
  treatUsernameAs: 'email',
  formPosition: 'right',
  loginTitle: '',
  showLoginPage: true,
  showRegisterPage: false,
  allowSocialAutoRegistration: true,
  additionalUserFields: [],
  socialLoginsSources: {},
  slots: {},
  disableUsernamePassword: false // Default to false
}

const edited = ref<IAuthConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {}),
  socialLoginsSources: ensureSocialLoginsSources(props.metadata || defaultMetadata)
})

const emit = defineEmits(['save']);

const { groupedSources, loaded: sourcedLoaded } = toRefs(useIntegrationSourcesStore())

const linkedInSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.LinkedIn] || []
})  

const facebookSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.Facebook] || []
})

const googleSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.Google] || []
})

const githubSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.GitHub] || []
});

// Computed property to check if any social login is configured 
const hasSocialLoginConfigured = computed(() => {
  // Check if the linkedin source ID is set and not null/empty
  const sources = edited.value.socialLoginsSources;
  return !!sources?.linkedin || !!sources?.google || !!sources?.github;
});

// Watch for changes in social login configuration when username/password is disabled
watch(() => edited.value.disableUsernamePassword, (newValue) => {
  if (newValue && !hasSocialLoginConfigured.value) {
    ElMessage({
      type: 'warning',
      message: 'Warning: You need to configure at least one social login method when disabling username/password login.',
      duration: 5000
    });
  }
});

async function save() {
  // VALIDATION: Prevent disabling username/password if no alternative is set
  if (edited.value.disableUsernamePassword && !hasSocialLoginConfigured.value) {
    ElMessage({
      type: 'error',
      message: 'Cannot disable Username/Password login without configuring at least one Social Login method (e.g., LinkedIn).',
      duration: 5000 
    });
    return; // Stop the save process
  }
  
  // Validate additional user fields
  if (edited.value.additionalUserFields.length > 0) {
    const invalidFields = edited.value.additionalUserFields.filter(field => {
      return !field.key || !field.name || !field.label;
    });
    
    if (invalidFields.length > 0) {
      ElMessage({
        type: 'error',
        message: 'Please fill in all required fields for Additional User Fields.',
        duration: 5000
      });
      return;
    }
  }

  emit('save', edited.value);
}

function ensureSocialLoginsSources(metadata: Partial<IAuthConfigurationMetadata>) {
  return {
    ...metadata.socialLoginsSources,
    google: metadata.socialLoginsSources?.google ?? null,
    linkedin: metadata.socialLoginsSources?.linkedin ?? null,
    facebook: metadata.socialLoginsSources?.facebook ?? null,
    github: metadata.socialLoginsSources?.github ?? null, 
  };
}

</script>
<style scoped>
.flex-row {
  gap: 0;
}

@media (max-width: 768px) {
  .flex-row {
    flex-direction: column;
  }
}

.form-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px); /* Adjust based on your header/nav height */
  min-height: 600px;
}

.auth-configuration-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  margin-bottom: 1rem;
}

/* Custom scrollbar styling */
.form-content::-webkit-scrollbar {
  width: 8px;
}

.form-content::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter, #f5f7fa);
  border-radius: 4px;
}

.form-content::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 4px;
}

.form-content::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark, #c0c4cc);
}

.form-actions {
  position: sticky;
  bottom: 0;
  padding: 1rem 0;
  background: linear-gradient(to top, var(--el-bg-color, #ffffff) 80%, transparent);
  border-block-start: 1px solid var(--el-border-color-light, #e4e7ed);
  display: flex;
  justify-content: flex-end;
  z-index: 10;
  backdrop-filter: blur(8px);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.preview-container {
  margin-inline-start: 2rem;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color, #ffffff);
  height: calc(100vh - 120px);
  position: sticky;
  inset-block-start: 20px;
}

.preview-header {
  padding: 1rem;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
  text-align: center;
  border-block-end: 1px solid var(--el-border-color-light, #e4e7ed);
}

.login-demo {
  border: none;
  margin: 0;
  transform: scale(0.9);
  transform-origin: top center;
  height: 100%;
  overflow: auto;
}

@media (max-width: 768px) {
  .form-wrapper {
    height: auto;
    min-height: auto;
    width: 100%;
    max-width: 100%;
  }
  
  .form-content {
    padding-right: 0;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .form-actions {
    padding: 1rem;
    margin: 0 -1rem;
  }
}
</style>
