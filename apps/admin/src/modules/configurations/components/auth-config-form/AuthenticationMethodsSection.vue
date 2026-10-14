<script lang="ts" setup>
import { computed } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import ConfigCard from '../ConfigCard.vue';
import SettingRow from '../SettingRow.vue';

const disableUsernamePassword = defineModel<boolean>('disableUsernamePassword', { required: true });
const allowSocialAutoRegistration = defineModel<boolean>('allowSocialAutoRegistration', { required: true });
const socialLoginsSources = defineModel<Record<string, any>>('socialLoginsSources', { required: true });

const props = defineProps<{
  sourcedLoaded: boolean;
  linkedInSources: any[];
  facebookSources: any[];
  googleSources: any[];
  githubSources: any[];
}>();

const providers = computed(() => [
  { key: 'google', name: 'Google', icon: ['fab', 'google'], color: '#db4437', sources: props.googleSources },
  { key: 'github', name: 'GitHub', icon: ['fab', 'github'], color: '#24292e', sources: props.githubSources },
  { key: 'linkedin', name: 'LinkedIn', icon: ['fab', 'linkedin'], color: '#0077b5', sources: props.linkedInSources },
  { key: 'facebook', name: 'Facebook', icon: ['fab', 'facebook'], color: '#1877f2', sources: props.facebookSources },
]);

const hasSocialLoginConfigured = computed(() => providers.value.some((provider) => !!socialLoginsSources.value?.[provider.key]));
</script>

<template>
  <ConfigCard id="auth-methods" :title="$t('Authentication Methods')" :description="$t('How people can sign in.')">
    <SettingRow :title="$t('Disable Username/Password Login?')" :description="$t('If enabled, users can only log in via Social Logins')">
      <template #default="{ labelledBy }"><el-switch v-model="disableUsernamePassword" :aria-labelledby="labelledBy" /></template>
    </SettingRow>
    <el-alert v-if="disableUsernamePassword && !hasSocialLoginConfigured" type="warning" :closable="false" show-icon>
      {{ $t('Warning: You are disabling username/password login, but no Social Login methods are configured. Users will not be able to log in!') }}
    </el-alert>

    <SettingRow :title="$t('Auto register non-existing users?')" :description="$t('When enabled, new users can register via social login without a separate registration step')">
      <template #default="{ labelledBy }"><el-switch v-model="allowSocialAutoRegistration" :aria-labelledby="labelledBy" /></template>
    </SettingRow>

    <h3 class="sub">{{ $t('Social Logins') }}</h3>
    <ul class="providers">
      <li v-for="provider in providers" :key="provider.key" class="provider">
        <span class="badge" :style="{ background: provider.color }" aria-hidden="true"><font-awesome-icon :icon="provider.icon as any" /></span>
        <span class="name">{{ provider.name }}</span>
        <div class="source">
          <template v-if="sourcedLoaded && !provider.sources?.length">
            <span class="none">{{ $t('No {provider} connections.', { provider: provider.name }) }}</span>
            <router-link class="create" :to="{ name: 'integrations-sources', params: { kind: provider.key } }">{{ $t('Create one') }}</router-link>
          </template>
          <FormInput v-else v-model="socialLoginsSources[provider.key]" :placeholder="$t('Select integration source')" type="select">
            <template #options>
              <el-option :label="`(${$t('none')})`" :value="null" />
              <el-option v-for="source in provider.sources" :key="source._id" :label="source.name" :value="source._id" />
            </template>
          </FormInput>
        </div>
      </li>
    </ul>
  </ConfigCard>
</template>

<style scoped lang="scss">
.sub {
  margin: 4px 0 0;
  padding: 0;
  font-size: 0.95rem;
}

.providers {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;

  li + li {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.provider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
}

.badge {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 34px;
  block-size: 34px;
  border-radius: 8px;
  color: #fff;
}

.name {
  flex: none;
  inline-size: 84px;
  font-weight: 600;
}

.source {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  min-inline-size: 0;

  :deep(.form-input-container),
  :deep(.el-form-item) {
    margin: 0;
    inline-size: 100%;
  }
}

.none {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.create {
  color: var(--el-color-primary);
  font-size: 0.9rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

@media (max-width: 639px) {
  .provider {
    flex-wrap: wrap;
  }

  .source {
    flex-basis: 100%;
  }
}
</style>
