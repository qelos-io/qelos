<template>
  <div class="section-container">
    <h2 class="section-title">{{ $t('Authentication Methods') }}</h2>
    <BlockItem>
      <FormInput
          v-model="disableUsernamePassword"
          title="Disable Username/Password Login?"
          label="If enabled, users can only log in via Social Logins"
          type="switch">
        <template #help>
          <span class="help-text">{{ $t('Use this option if you want to enforce social login methods only') }}</span>
        </template>
      </FormInput>
 
      <el-alert v-if="disableUsernamePassword && !hasSocialLoginConfigured" type="warning" :closable="false" show-icon>
        {{ $t('Warning: You are disabling username/password login, but no Social Login methods are configured. Users will not be able to log in!') }}
      </el-alert>
    </BlockItem>

    <!-- Social Logins Section -->
    <h3 class="subsection-title">{{ $t('Social Logins') }}</h3>
    <BlockItem>
      <FormInput v-model="allowSocialAutoRegistration" 
                title="Auto register non-existing users?" 
                type="switch">
        <template #help>
          <span class="help-text">{{ $t('When enabled, new users can register via social login without a separate registration step') }}</span>
        </template>
      </FormInput>
    </BlockItem>
    
    <div class="social-logins-grid">
      <!-- LinkedIn -->
      <div class="social-login-card">
        <div class="social-card-header">
          <font-awesome-icon :icon="['fab', 'linkedin']" class="social-icon linkedin"/>
          <span class="social-name">{{ $t('LinkedIn') }}</span>
        </div>
        <div class="social-card-content">
          <div v-if="sourcedLoaded && (!linkedInSources?.length)" class="no-integration-state">
            <el-alert :closable="false" type="info" :show-icon="false">
              <template #default>
                <div class="alert-content">
                  {{ $t('No LinkedIn connections.') }}
                  <router-link
                      class="primary-link"
                      :to="{name: 'integrations-sources', params: { kind: 'linkedin'}}">
                    {{ $t('Create one') }}
                  </router-link>
                </div>
              </template>
            </el-alert>
          </div>
          <FormInput v-else v-model="socialLoginsSources.linkedin"
                    placeholder="Select integration source"
                    type="select" 
                    class="social-select">
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null"/>
              <el-option v-for="source in linkedInSources" :key="source._id" :label="source.name" :value="source._id"/>
            </template>
          </FormInput>
        </div>
      </div>
      
      <!-- Facebook -->
      <div class="social-login-card">
        <div class="social-card-header">
          <font-awesome-icon :icon="['fab', 'facebook']" class="social-icon facebook"/>
          <span class="social-name">{{ $t('Facebook') }}</span>
        </div>
        <div class="social-card-content">
          <div v-if="sourcedLoaded && !facebookSources?.length" class="no-integration-state">
            <el-alert :closable="false" type="info" :show-icon="false">
              <template #default>
                <div class="alert-content">
                  {{ $t('No Facebook connections.') }}
                  <router-link
                    class="primary-link"
                    :to="{ name: 'integrations-sources', params: { kind: 'facebook' } }">
                    {{ $t('Create one') }}
                  </router-link>
                </div>
              </template>
            </el-alert>
          </div>
          <FormInput v-else v-model="socialLoginsSources.facebook"
                    placeholder="Select integration source"
                    type="select" 
                    class="social-select">
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null"/>
              <el-option v-for="source in facebookSources" :key="source._id" :label="source.name" :value="source._id"/>
            </template>
          </FormInput>
        </div>
      </div>
      
      <!-- Google -->
      <div class="social-login-card">
        <div class="social-card-header">
          <font-awesome-icon :icon="['fab', 'google']" class="social-icon google"/>
          <span class="social-name">{{ $t('Google') }}</span>
        </div>
        <div class="social-card-content">
          <div v-if="sourcedLoaded && !googleSources?.length" class="no-integration-state">
            <el-alert :closable="false" type="info" :show-icon="false">
              <template #default>
                <div class="alert-content">
                  {{ $t('No Google connections.') }}
                  <router-link
                    class="primary-link"
                    :to="{ name: 'integrations-sources', params: { kind: 'google' } }">
                    {{ $t('Create one') }}
                  </router-link>
                </div>
              </template>
            </el-alert>
          </div>
          <FormInput v-else v-model="socialLoginsSources.google"
                    placeholder="Select integration source"
                    type="select" 
                    class="social-select">
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null"/>
              <el-option v-for="source in googleSources" :key="source._id" :label="source.name" :value="source._id"/>
            </template>
          </FormInput>
        </div>
      </div>
      
      <!-- GitHub -->
      <div class="social-login-card">
        <div class="social-card-header">
          <font-awesome-icon :icon="['fab', 'github']" class="social-icon github"/>
          <span class="social-name">{{ $t('GitHub') }}</span>
        </div>
        <div class="social-card-content">
          <div v-if="sourcedLoaded && !githubSources?.length" class="no-integration-state">
            <el-alert :closable="false" type="info" :show-icon="false">
              <template #default>
                <div class="alert-content">
                  {{ $t('No GitHub connections.') }}
                  <router-link
                    class="primary-link"
                    :to="{ name: 'integrations-sources', params: { kind: 'github' } }">
                    {{ $t('Create one') }}
                  </router-link>
                </div>
              </template>
            </el-alert>
          </div>
          <FormInput v-else v-model="socialLoginsSources.github"
                    placeholder="Select integration source"
                    type="select" 
                    class="social-select">
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null"/>
              <el-option v-for="source in githubSources" :key="source._id" :label="source.name" :value="source._id"/>
            </template>
          </FormInput>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { IntegrationSourceKind } from '@qelos/global-types';

const disableUsernamePassword = defineModel<boolean>('disableUsernamePassword', { required: true });
const allowSocialAutoRegistration = defineModel<boolean>('allowSocialAutoRegistration', { required: true });
const socialLoginsSources = defineModel<Record<string, string | null>>('socialLoginsSources', { required: true });

const { groupedSources, loaded: sourcedLoaded } = toRefs(useIntegrationSourcesStore());

const linkedInSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.LinkedIn] || [];
});

const facebookSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.Facebook] || [];
});

const googleSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.Google] || [];
});

const githubSources = computed(() => {
  return groupedSources.value[IntegrationSourceKind.GitHub] || [];
});

const hasSocialLoginConfigured = computed(() => {
  const sources = socialLoginsSources.value;
  return !!sources?.linkedin || !!sources?.google || !!sources?.github || !!sources?.facebook;
});
</script>

<style scoped>
.section-container {
  margin-block-end: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-block-start: 0;
  margin-block-end: 1rem;
  color: var(--el-text-color-primary, #303133);
  border-block-end: 1px solid var(--el-border-color-light, #e4e7ed);
  padding-block-end: 0.75rem;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-block-start: 1.5rem;
  margin-block-end: 1rem;
  color: var(--el-text-color-primary, #303133);
}

.help-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  display: block;
  margin-block-start: 0.25rem;
}

.social-logins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1rem;
  margin-block-start: 1rem;
}

.social-login-card {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}

.social-login-card:hover {
  border-color: var(--el-border-color, #dcdfe6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.social-card-header {
  display: flex;
  align-items: center;
  margin-block-end: 0.75rem;
  padding-block-end: 0.75rem;
  border-block-end: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.social-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--el-text-color-primary, #303133);
}

.social-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.social-icon {
  font-size: 1.5rem;
  margin-inline-end: 0.75rem;
  
  &.linkedin {
    color: #0077b5;
  }
  &.facebook {
    color: #1877f2;
  }
  &.google {
    color: #4285f4;
  }
  &.github {
    color: #24292e;
  }
}

.no-integration-state {
  flex: 1;
  display: flex;
  align-items: center;
}

.alert-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.primary-link {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
  font-weight: 500;
  margin: 0 0.25rem;
  
  &:hover {
    text-decoration: underline;
  }
}

.social-select {
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .section-container {
    padding: 1rem;
    margin-block-end: 1rem;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .social-logins-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .social-login-card {
    padding: 0.75rem;
    min-height: auto;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .social-logins-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
