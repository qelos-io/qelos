<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLogin } from '../compositions/authentication';
import type { IAuthConfigurationMetadata } from '@qelos/global-types';

const props = defineProps<{
  authConfig: IAuthConfigurationMetadata;
  /** inside the auth configuration editor: looks real, does nothing */
  preview?: boolean;
}>();

const { t } = useI18n();
const { login, form, isLoggedIn } = useLogin();
const router = useRouter();

const submitting = ref(false);
const error = ref('');

const usernameLabel = computed(() => {
  switch (props.authConfig.treatUsernameAs) {
    case 'email':
      return t('Email');
    case 'phone':
      return t('Phone number');
    case 'username':
      return t('Username');
    default:
      return t('Username / Email');
  }
});
const usernameType = computed(() => (props.authConfig.treatUsernameAs === 'email' ? 'email' : props.authConfig.treatUsernameAs === 'phone' ? 'tel' : 'text'));
const usernameAutocomplete = computed(() => (props.authConfig.treatUsernameAs === 'email' ? 'email' : props.authConfig.treatUsernameAs === 'phone' ? 'tel' : 'username'));

const providers = computed(() => {
  const sources = props.authConfig.socialLoginsSources || {};
  return [
    { key: 'google', label: t('Login with Google'), icon: ['fab', 'google'] },
    { key: 'github', label: t('Login with GitHub'), icon: ['fab', 'github'] },
    { key: 'linkedin', label: t('Login with LinkedIn'), icon: ['fab', 'linkedin'] },
    { key: 'facebook', label: t('Login with Facebook'), icon: ['fab', 'facebook'] },
  ].filter((provider) => (sources as Record<string, unknown>)[provider.key]);
});
const hasPassword = computed(() => !props.authConfig.disableUsernamePassword);

watch(isLoggedIn, (is) => {
  if (is && !props.preview) {
    const redirect = router.currentRoute.value.query.redirect as string;
    if (redirect) {
      router.push(redirect);
    } else {
      router.push({ name: 'qelos-home' });
    }
  }
});

async function submit() {
  if (props.preview || submitting.value) return;
  error.value = '';
  submitting.value = true;
  try {
    await login();
  } catch (err: any) {
    error.value = err?.response?.data?.message || t('We could not sign you in. Check your details and try again.');
  } finally {
    submitting.value = false;
  }
}

const loginWith = (provider: string) => {
  if (props.preview) return;
  const redirect = router.currentRoute.value.query.redirect as string;
  let url = `/api/auth/${provider}`;
  if (redirect) {
    const returnUrl = `/auth/callback?returnUrl=${encodeURIComponent(redirect)}`;
    url += `?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  window.location.href = url;
};
</script>

<template>
  <div class="card" :inert="preview || undefined">
    <slot name="header" />

    <form v-if="hasPassword" class="form" novalidate @submit.prevent="submit">
      <el-alert v-if="error" class="error" type="error" show-icon :closable="false" :title="error" role="alert" />

      <div class="field">
        <label for="login-username">{{ usernameLabel }}</label>
        <el-input id="login-username" v-model="form.username" size="large" name="username" :type="usernameType" :autocomplete="usernameAutocomplete" dir="ltr" required />
      </div>
      <div class="field">
        <label for="login-password">{{ $t('Password') }}</label>
        <el-input id="login-password" v-model="form.password" size="large" name="password" type="password" show-password autocomplete="current-password" dir="ltr" required />
      </div>

      <el-button type="primary" size="large" native-type="submit" class="submit" :loading="submitting">
        {{ $t('Login') }}
        <font-awesome-icon :icon="['fas', $t('appDirection') === 'rtl' ? 'arrow-left-long' : 'arrow-right-long']" class="arrow" aria-hidden="true" />
      </el-button>
    </form>

    <template v-if="providers.length">
      <div v-if="hasPassword" class="separator" role="separator"><span>{{ $t('OR') }}</span></div>
      <div class="providers">
        <button v-for="provider in providers" :key="provider.key" type="button" class="social" :class="provider.key" @click="loginWith(provider.key)">
          <font-awesome-icon :icon="provider.icon" class="social-icon" aria-hidden="true" />
          <span>{{ provider.label }}</span>
        </button>
      </div>
    </template>

    <slot name="footer" />
  </div>
</template>

<style scoped lang="scss">
.card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  inline-size: 100%;
  max-inline-size: 440px;
  margin-inline: auto;
  padding: 28px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 6px);
  background: var(--surface);
  color: var(--el-text-color-primary);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.08);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: var(--el-text-color-regular);
    font-size: 0.9rem;
    font-weight: 600;
  }
}

.submit {
  inline-size: 100%;
  margin-block-start: 4px;
  gap: 10px;
}

.arrow {
  margin-inline-start: 8px;
}

.separator {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-block-start: 1px solid var(--el-border-color-lighter);
  }
}

.providers {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// brand colours stay (they identify the provider); everything else follows the theme
.social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-block-size: 46px;
  padding: 0 16px;
  border: 0;
  border-radius: calc(var(--border-radius, 6px) * 1.2);
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(0.92);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.google {
    background: #db4437;
  }

  &.github {
    background: #24292e;
  }

  &.linkedin {
    background: #0077b5;
  }

  &.facebook {
    background: #1877f2;
  }
}

.social-icon {
  font-size: 1.15rem;
}

@media (max-width: 639px) {
  .card {
    padding: 20px;
    box-shadow: none;
  }
}
</style>

