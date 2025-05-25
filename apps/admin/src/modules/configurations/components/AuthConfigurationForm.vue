<template>
  <div class="flex-row">
    <el-form @submit.native.prevent="save" class="auth-configuration-form flex-2">
      <!-- Main Settings Section -->
      <div class="section-container">
        <h2 class="section-title">{{ $t('General Settings') }}</h2>
        <div class="flex-row-column">
          <BlockItem>
            <FormInput v-model="edited.showLoginPage" title="Show Login Page?" type="switch">
              <template #help>
                <span class="help-text">{{ $t('Enable or disable the login page for your application') }}</span>
              </template>
            </FormInput>

            <div v-if="edited.showLoginPage" class="form-subsection">
              <div class="subsection-label">Form Position</div>
              <div class="flex-row positions-list">
                <div class="position-option left" @click="edited.formPosition = 'left'"
                    :class="{selected: edited.formPosition === 'left'}">
                  <div class="position-tooltip">{{ $t('Left') }}</div>
                </div>
                <div class="position-option right" @click="edited.formPosition = 'right'"
                    :class="{selected: edited.formPosition === 'right'}">
                  <div class="position-tooltip">{{ $t('Right') }}</div>
                </div>
                <div class="position-option center" @click="edited.formPosition = 'center'"
                    :class="{selected: edited.formPosition === 'center'}">
                  <div class="inner"/>
                  <div class="position-tooltip">{{ $t('Center') }}</div>
                </div>
                <div class="position-option top" @click="edited.formPosition = 'top'"
                    :class="{selected: edited.formPosition === 'top'}">
                  <div class="position-tooltip">{{ $t('Top') }}</div>
                </div>
                <div class="position-option bottom" @click="edited.formPosition = 'bottom'"
                    :class="{selected: edited.formPosition === 'bottom'}">
                  <div class="position-tooltip">{{ $t('Bottom') }}</div>
                </div>
              </div>
            </div>
          </BlockItem>
          <BlockItem>
            <div class="enhanced-toggle-container">
              <FormInput v-model="edited.showRegisterPage" type="switch">
                <template #pre>
                  <div>{{$t('Show Registration Page?')}}</div>
                  <div class="toggle-icon">
                    <font-awesome-icon :icon="['fas', 'user-plus']" :class="{'active': edited.showRegisterPage}" />
                  </div>
                </template>
                <template #help>
                  <div class="toggle-help">
                    <span class="help-text">{{ $t('Enable or disable the registration page for new users') }}</span>
                    <div v-if="edited.showRegisterPage" class="toggle-status enabled">
                      <font-awesome-icon :icon="['fas', 'check-circle']" /> 
                      {{ $t('Registration is enabled - New users can create accounts') }}
                    </div>
                    <div v-else class="toggle-status disabled">
                      <font-awesome-icon :icon="['fas', 'info-circle']" /> 
                      {{ $t('Registration is disabled - Only existing users can log in') }}
                    </div>
                  </div>
                </template>
              </FormInput>
            </div>
          </BlockItem>
          <BlockItem>
            <FormInput v-model="edited.treatUsernameAs"
                      title="Treat Username As" 
                      label="Determines how username fields will be validated"
                      type="select">
              <template #options>
                <el-option label="Email" value="email"/>
                <el-option label="Username" value="username"/>
                <el-option label="Phone" value="phone"/>
              </template>
              <template #help>
                <span class="help-text">{{ $t('This affects validation rules and keyboard types on mobile devices') }}</span>
              </template>
            </FormInput>
          </BlockItem>
        </div>
      </div>

      <!-- Login Page Appearance Section -->
      <div class="section-container">
        <h2 class="section-title">{{ $t('Login Page Appearance') }}</h2>
        <BlockItem>
          <FormInput v-model="edited.backgroundImage" title="Background Image" type="upload">
            <template #help>
              <span class="help-text">{{ $t('Add a background image to enhance your login page') }}</span>
            </template>
          </FormInput>
          
          <FormInput v-model="edited.loginTitle"
                    :disabled="!!edited.slots?.loginHeader"
                    title="Title of Login Page"
                    :placeholder="$t('Welcome')">
            <template #help>
              <span class="help-text" v-if="!!edited.slots?.loginHeader">{{ $t('Disabled because a custom header is selected') }}</span>
              <span class="help-text" v-else>{{ $t('The main heading displayed on your login page') }}</span>
            </template>
          </FormInput>

          <FormRowGroup>
            <BlocksSelector v-model="edited.slots.loginHeader" editable title="Header Content Box">
              <template #help>
                <span class="help-text">{{ $t('Custom content to display at the top of the login form') }}</span>
              </template>
            </BlocksSelector>
            <BlocksSelector v-model="edited.slots.loginFooter" editable title="Footer Content Box">
              <template #help>
                <span class="help-text">{{ $t('Custom content to display at the bottom of the login form') }}</span>
              </template>
            </BlocksSelector>
          </FormRowGroup>
        </BlockItem>
      </div>

      <!-- Authentication Methods Section -->
      <div class="section-container">
        <h2 class="section-title">{{ $t('Authentication Methods') }}</h2>
        <BlockItem>
          <FormInput
              v-model="edited.disableUsernamePassword"
              title="Disable Username/Password Login?"
              label="If enabled, users can only log in via Social Logins"
              type="switch">
            <template #help>
              <span class="help-text">{{ $t('Use this option if you want to enforce social login methods only') }}</span>
            </template>
          </FormInput>
   
          <el-alert v-if="edited.disableUsernamePassword && !hasSocialLoginConfigured" type="warning" :closable="false" show-icon>
            {{ $t('Warning: You are disabling username/password login, but no Social Login methods are configured. Users will not be able to log in!') }}
          </el-alert>
        </BlockItem>

        <!-- Social Logins Section -->
        <h3 class="subsection-title">{{ $t('Social Logins') }}</h3>
        <div class="flex-row-column">
          <BlockItem>
            <FormInput v-model="edited.allowSocialAutoRegistration" 
                      title="Auto register non-existing users?" 
                      type="switch">
              <template #help>
                <span class="help-text">{{ $t('When enabled, new users can register via social login without a separate registration step') }}</span>
              </template>
            </FormInput>
          </BlockItem>
          <BlockItem class="flex-1 social-login-container">
            <div v-if="sourcedLoaded && !linkedInSources?.length">
              <div class="social-provider-header">
                <font-awesome-icon :icon="['fab', 'linkedin']" class="social-icon linkedin"/>
                <span class="pad-start">{{ $t('LinkedIn') }}</span>
              </div>
              <el-alert :closable="false" type="info">
                {{ $t('You have not integrated any LinkedIn connections.') }}
                <router-link
                    class="primary-link"
                    :to="{name: 'integrations-sources', params: { kind: 'linkedin'}}">
                  {{ $t('Navigate to LinkedIn Connections') }}
                </router-link>
                {{ $t('to create one.') }}
              </el-alert>
            </div>
            <FormInput v-else v-model="edited.socialLoginsSources.linkedin"
                      placeholder="Select LinkedIn Integration Source"
                      type="select" class="social-input">
              <template #pre>
                <font-awesome-icon :icon="['fab', 'linkedin']" class="social-icon linkedin"/>
                <span class="pad-start">{{ $t('LinkedIn') }}</span>
              </template>
              <template #options>
                <el-option :label="`(${$t('none')})`" :value="null"/>
                <el-option v-for="source in linkedInSources" :key="source._id" :label="source.name" :value="source._id"/>
              </template>
              <template #help>
                <span class="help-text">{{ $t('Select the LinkedIn integration to use for social login') }}</span>
              </template>
            </FormInput>
          </BlockItem>
        </div>
      </div>

      <!-- Additional User Fields Section -->
      <div class="section-container">
        <h2 class="section-title">{{ $t('Additional User Fields') }}</h2>
        <p class="section-description">{{ $t('Define custom fields to collect from users during registration') }}</p>
        
        <div class="user-fields-container">
          <div v-if="edited.additionalUserFields.length === 0" class="empty-state">
            <p>{{ $t('No additional fields defined yet. Add fields to collect more information from users.') }}</p>
          </div>
          
          <FormRowGroup v-for="(row, index) in edited.additionalUserFields" :key="index" class="user-field-row">
            <FormInput v-model="row.key" title="Key" type="text" required/>
            <FormInput v-model="row.name" title="Name" type="text" required/>
            <FormInput v-model="row.label" title="Label" type="text" required/>
            <FormInput v-model="row.inputType" title="Input Type" type="select" required>
              <template #options>
                <el-option label="Text" value="text"/>
                <el-option label="Select" value="select"/>
                <el-option label="Radio" value="radio"/>
                <el-option label="Checkbox" value="checkbox"/>
              </template>
            </FormInput>
            <FormInput v-model="row.valueType" title="Value Type" type="select" required>
              <template #options>
                <el-option label="String" value="string"/>
                <el-option label="Number" value="number"/>
                <el-option label="Boolean" value="boolean"/>
              </template>
            </FormInput>
            <FormInput class="flex-0" v-model="row.required" title="Required" type="switch"/>
            <div class="flex-0 remove-row">
              <RemoveButton @click="edited.additionalUserFields.splice(index, 1)" />
            </div>
          </FormRowGroup>
        </div>
        
        <AddMore
            class="add-field-button"
            @click="edited.additionalUserFields.push({inputType: 'text',key: undefined ,label: undefined ,name: undefined ,required: false ,valueType: 'string'})"/>
      </div>

      <div class="form-actions">
        <SaveButton :submitting="submitting" />
      </div>
    </el-form>
    
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
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import Login from '@/modules/core/Login.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';
import BlocksSelector from '@/modules/blocks/components/BlocksSelector.vue';

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
  ...(props.metadata || {})
})

const emit = defineEmits(['save']);

const { groupedSources, loaded: sourcedLoaded } = toRefs(useIntegrationSourcesStore())

const linkedInSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.LinkedIn] || []
})

// Computed property to check if any social login is configured 
const hasSocialLoginConfigured = computed(() => {
  // Check if the linkedin source ID is set and not null/empty
  return !!edited.value.socialLoginsSources?.linkedin;
});

// Computed property to check if form is valid
const formIsValid = computed(() => {
  // If username/password is disabled, social login must be configured
  if (edited.value.disableUsernamePassword && !hasSocialLoginConfigured.value) {
    return false;
  }
  
  // Check additional user fields validity
  if (edited.value.additionalUserFields.length > 0) {
    return !edited.value.additionalUserFields.some(field => {
      return !field.key || !field.name || !field.label;
    });
  }
  
  return true;
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
</script>
<style scoped>
/* Section containers and layout */
.section-container {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary, #303133);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  padding-bottom: 0.75rem;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: var(--el-text-color-primary, #303133);
}

.section-description {
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.form-subsection {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--el-border-color-lighter, #ebeef5);
}

.subsection-label {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: var(--el-text-color-secondary, #909399);
}

.form-actions {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--el-border-color-light, #e4e7ed);
  display: flex;
  justify-content: flex-end;
}

/* Position options styling */
.positions-list {
  flex-wrap: wrap;
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.position-option {
  display: block;
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  margin: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 0;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1;
    
    .position-tooltip {
      opacity: 1;
      transform: translateY(0);
      z-index: 99999;
    }
  }

  &.left {
    border-left: 4px solid #759b7d;
  }

  &.right {
    border-right: 4px solid #759b7d;
  }

  &.top {
    border-top: 4px solid #759b7d;
  }

  &.bottom {
    border-bottom: 4px solid #759b7d;
  }

  &.center {
    position: relative;

    .inner {
      position: absolute;
      top: 15%;
      bottom: 15%;
      left: 15%;
      right: 15%;
      border: 4px solid #759b7d;
      border-radius: 2px;
    }
  }

  &.selected {
    background-color: rgba(117, 155, 125, 0.15);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .position-tooltip {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%) translateY(5px);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
    z-index: 1;
  }
}

/* Enhanced toggle styling */
.enhanced-toggle-container {
  margin-bottom: 0.5rem;
}

.toggle-icon {
  margin-right: 0.75rem;
  font-size: 1.1rem;
  color: var(--el-text-color-secondary, #909399);
  transition: color 0.3s ease;
}

.toggle-icon .active {
  color: var(--el-color-primary, #409eff);
}

.toggle-help {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-status {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.toggle-status.enabled {
  background-color: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
  border-left: 3px solid var(--el-color-success, #67c23a);
}

.toggle-status.disabled {
  background-color: var(--el-color-info-light-9, #f4f4f5);
  color: var(--el-color-info, #909399);
  border-left: 3px solid var(--el-color-info, #909399);
}

/* Help text styling */
.help-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  display: block;
  margin-top: 0.25rem;
}

/* User fields styling */
.user-fields-container {
  margin-bottom: 1rem;
}

.user-field-row {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 4px;
  background-color: var(--el-bg-color, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.add-field-button {
  margin-top: 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  background-color: var(--el-bg-color, #ffffff);
  border-radius: 4px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  color: var(--el-text-color-secondary, #909399);
}

/* Social login styling */
.social-login-container {
  margin-top: 0.5rem;
}

.social-provider-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.social-icon {
  font-size: 1.25rem;
  margin-right: 0.5rem;
  
  &.linkedin {
    color: #0077b5;
  }
}

/* Preview container styling */
.preview-container {
  margin-left: 2rem;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color, #ffffff);
}

.preview-header {
  padding: 1rem;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.login-demo {
  border: none;
  margin: 0;
  transform: scale(0.9);
  transform-origin: top center;
  height: 600px;
  overflow: auto;
}
</style>
