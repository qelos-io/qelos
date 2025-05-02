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

    <template v-if="authConfig.socialLoginsSources?.linkedin">
      <div v-if="!props.authConfig?.disableUsernamePassword" class="separator">
        <span>{{ $t('OR') }}</span>
      </div>

      <el-button type="primary" class="linkedin-button" @click="loginWithLinkedIn">
        <font-awesome-icon :icon="['fab', 'linkedin']" class="linkedin-icon" />
        <span>{{ $t('Login with LinkedIn') }}</span>
      </el-button>
    </template>

    <slot name="footer"/>
  </div>
</template>

<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLogin } from '../compositions/authentication'
import { useSubmitting } from '../compositions/submitting'
import { IAuthConfigurationMetadata } from '@qelos/global-types';

const props = defineProps<{ authConfig: IAuthConfigurationMetadata }>()

const { login, form, isLoggedIn } = useLogin()
const router = useRouter()

const { submit, submitting } = useSubmitting(login, { error: 'Login failed' })

watch(isLoggedIn, (is) => {
  if (is) {
    const redirect = router.currentRoute.value.query.redirect as string
    if (redirect) {
      router.push(redirect);
      return
    } else {
      router.push({ name: 'home' })
    }
  }
})

const onFocus = () => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
}

const loginWithLinkedIn = () => {
  window.location.href = '/api/auth/linkedin';
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
  margin-left: auto;
  position: absolute;
  right: 10px;
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

.linkedin-icon {
  font-size: calc(var(--base-font-size) * 1.1);
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

.linkedin-button {
  width: 90%;
  background-color: #0077b5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-size: var(--base-font-size);
  border-radius: calc(var(--border-radius) * 1.2);
  transition: background-color 0.3s;
}

.linkedin-button:hover {
  background-color: #005f91;
}

.linkedin-icon {
  font-size: var(--large-font-size);
  margin-right: 18px;
}
</style>
