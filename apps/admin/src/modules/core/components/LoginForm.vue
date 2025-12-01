<template>
  <div class="login-container">
    <slot name="header" />
    <el-form v-if="!props.authConfig?.disableUsernamePassword" class="login-form" @submit.native.prevent="submit">
      <el-form-item :label="$t('Username / Email')" class="form-item-flex">
        <el-input size="large" name="username" v-model="form.username" :type="authConfig.treatUsernameAs" required
          @focus="onFocus" dir="ltr" />
      </el-form-item>
      <el-form-item :label="$t('Password')" class="form-item-flex">
        <el-input size="large" name="password" v-model="form.password" type="password" required @focus="onFocus"
          dir='ltr' />
      </el-form-item>
      <div class="form-buttons">
        <el-button native-type="submit" :loading="submitting">
          <span>{{ $t('Login') }}</span>
          <template #icon>
            <font-awesome-icon :icon="['fas', 'arrow-right-long']" />
          </template>
        </el-button>
      </div>
    </el-form>

    <template v-if="hasSocialLogins">
      <div v-if="!props.authConfig?.disableUsernamePassword" class="separator">
        <span>{{ $t('OR') }}</span>
      </div>

      <el-button v-if="authConfig.socialLoginsSources?.linkedin" type="primary" class="social-btn linkedin-button" @click="loginWith('linkedin')">
        <font-awesome-icon :icon="['fab', 'linkedin']" class="social-icon" />
        <span>{{ $t('Login with LinkedIn') }}</span>
      </el-button>
      <el-button v-if="authConfig.socialLoginsSources?.facebook" type="primary" class="social-btn facebook-button" @click="loginWith('facebook')">
        <font-awesome-icon :icon="['fab', 'facebook']" class="social-icon" />
        <span>{{ $t('Login with Facebook') }}</span>
      </el-button>
      <el-button v-if="authConfig.socialLoginsSources?.google" type="primary" class="social-btn google-button" @click="loginWith('google')">
        <font-awesome-icon :icon="['fab', 'google']" class="social-icon" />
        <span>{{ $t('Login with Google') }}</span>
      </el-button>
      <el-button v-if="authConfig.socialLoginsSources?.github" type="primary" class="social-btn github-button" @click="loginWith('github')">
        <font-awesome-icon :icon="['fab', 'github']" class="social-icon" />
        <span>{{ $t('Login with GitHub') }}</span>
      </el-button>
    </template>

    <slot name="footer"/>
  </div>
</template>

<script lang="ts" setup>
import { watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLogin } from '../compositions/authentication'
import { useSubmitting } from '../compositions/submitting'
import { IAuthConfigurationMetadata } from '@qelos/global-types';

const props = defineProps<{ authConfig: IAuthConfigurationMetadata }>()

const { login, form, isLoggedIn } = useLogin()
const router = useRouter()

const { submit, submitting } = useSubmitting(login, { error: 'Login failed' })

const hasSocialLogins = computed(() => {
  return props.authConfig.socialLoginsSources?.linkedin || props.authConfig.socialLoginsSources?.facebook || props.authConfig.socialLoginsSources?.google || props.authConfig.socialLoginsSources?.github
})
watch(isLoggedIn, (is) => {
  if (is) {
    const redirect = router.currentRoute.value.query.redirect as string
    if (redirect) {
      router.push(redirect);
      return
    } else {
      router.push({ name: 'qelos-home' })
    }
  }
})

const onFocus = () => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
}

const loginWith = (provider: 'linkedin' | 'facebook' | 'google' | 'github') => {
  window.location.href = `/api/auth/${provider}`;
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: var(--border-radius);
}

form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 90%;
  max-width: 500px;
  margin: 0 auto;
}

.form-buttons {
  text-align: end;

  .el-button {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
}

.form-buttons :deep(.el-icon) {
  margin-inline-start: auto;
  position: absolute;
  inset-inline-end: 10px;
}

.linkedin-button {
  width: 100%;
  background-color: #0077b5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.separator {
  display: flex;
  align-items: center;
  width: 90%;
  text-align: center;
  margin: 20px 0;
}

.separator::before,
.separator::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #ccc;
}

.separator span {
  padding: 0 12px;
  color: #666;
  white-space: nowrap;
}

.social-btn {
  width: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline: 0;
  margin-block: 5px;
  gap: 8px;
  padding: 20px;
  font-size: var(--base-font-size);
  border-radius: calc(var(--border-radius) * 1.2);
  transition: background-color 0.3s;
  color: white;
}

.linkedin-button {
  background-color: #0077b5;
}

.facebook-button {
  background-color: #1877f2;
}

.google-button {
  background-color: #db4437;
}

.github-button {
  background-color: #24292e;
}

.linkedin-button:hover {
  background-color: #005f91;
}
.facebook-button:hover {
  background-color: #1565c0;
}
.google-button:hover {
  background-color: #db4437;
}
.github-button:hover {
  background-color: #24292e;
}

.social-icon {
  font-size: var(--large-font-size);
  margin-inline-end: 18px;
}
</style>
