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

          <ApiTokenSettingsSection
            v-model:allow-user-token-authentication="edited.allowUserTokenAuthentication"
            v-model:token-authentication-permissions="edited.tokenAuthenticationPermissions"
          />

          <AdditionalUserFieldsSection
            v-model:additional-user-fields="edited.additionalUserFields"
          />
        </div>

      </el-form>
    </div>
    
    <!-- Live preview: the real login page, at a real device width -->
    <aside v-if="isWide" class="preview-container flex-1" :aria-label="$t('Live Preview')">
      <div class="preview-header">
        <span>{{ $t('Live Preview') }}</span>
        <el-segmented v-model="device" size="small" :options="deviceOptions" :aria-label="$t('Preview device')" />
      </div>
      <div class="preview-body"><LoginPreviewFrame :config="edited" :device="device" /></div>
      <a class="preview-open" href="/login" target="_blank" rel="noopener">{{ $t('Open the saved login page') }}</a>
    </aside>

    <template v-else>
      <el-button class="preview-fab" type="primary" round size="large" @click="previewOpen = true">
        <font-awesome-icon :icon="['fas', 'eye']" /> {{ $t('Preview') }}
      </el-button>
      <el-drawer v-model="previewOpen" direction="btt" size="88%" :title="$t('Live Preview')">
        <el-segmented v-model="device" size="small" :options="deviceOptions" :aria-label="$t('Preview device')" class="drawer-device" />
        <LoginPreviewFrame :config="edited" :device="device" />
      </el-drawer>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, watch } from 'vue';
import { useConfigDraft } from '../compositions/config-shell';
import { IAuthConfigurationMetadata, IntegrationSourceKind } from '@qelos/global-types';
import LoginPreviewFrame from './auth-config-form/LoginPreviewFrame.vue';
import { useViewport } from '@/modules/core/compositions/viewport';
import { useI18n } from 'vue-i18n';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';
import GeneralSettingsSection from './auth-config-form/GeneralSettingsSection.vue';
import LoginPageAppearanceSection from './auth-config-form/LoginPageAppearanceSection.vue';
import AuthenticationMethodsSection from './auth-config-form/AuthenticationMethodsSection.vue';
import AdditionalUserFieldsSection from './auth-config-form/AdditionalUserFieldsSection.vue';
import ApiTokenSettingsSection from './auth-config-form/ApiTokenSettingsSection.vue';

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
  disableUsernamePassword: false, // Default to false
  allowUserTokenAuthentication: false,
  tokenAuthenticationPermissions: { roles: [], wsRoles: [] },
}

const edited = ref<IAuthConfigurationMetadata>({
  ...defaultMetadata,
  ...(props.metadata || {}),
  socialLoginsSources: ensureSocialLoginsSources(props.metadata || defaultMetadata)
})

const emit = defineEmits(['save']);
useConfigDraft(edited);

const { t } = useI18n();
const { width } = useViewport();
const isWide = computed(() => width.value >= 1100);
const previewOpen = ref(false);
const device = ref<'desktop' | 'phone'>('desktop');
const deviceOptions = [
  { label: t('Desktop'), value: 'desktop' },
  { label: t('Phone'), value: 'phone' },
];

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
}

.auth-configuration-form {
  display: flex;
  flex-direction: column;
}

.form-content {
  flex: 1;
  margin-bottom: 1rem;
}

.preview-container {
  position: sticky;
  inset-block-start: 20px;
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  gap: 12px;
  min-inline-size: 0;
  margin-inline-start: 2rem;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.preview-body {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
}

.preview-open {
  color: var(--el-color-primary);
  font-size: 0.88rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.preview-fab {
  position: fixed;
  inset-block-end: calc(76px + env(safe-area-inset-bottom, 0px));
  inset-inline-end: 16px;
  z-index: 900;
  gap: 8px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}

.drawer-device {
  margin-block-end: 12px;
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
