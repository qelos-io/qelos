<template>
  <div class="login-container">
    <el-form class="login-form" @submit.native.prevent="submit">
      <el-form-item :label="$t('Username / Email')" class="form-item-flex">
        <el-input size="large" name="username" v-model="form.username" :type="metadata.treatUsernameAs" required
                  @focus="onFocus" dir="ltr"/>
      </el-form-item>
      <el-form-item :label="$t('Password')" class="form-item-flex">
        <el-input size="large" name="password" v-model="form.password" type="password" required @focus="onFocus"
                  dir='ltr'/>
      </el-form-item>
      <div class="form-buttons">
        <SaveButton :submitting="submitting" :text="$t('Login')"/>
      </div>
    </el-form>
    <template v-if="metadata.socialLoginsSources?.linkedin">
      <div class="separator">
        <span>{{ $t('OR') }}</span>
      </div>
      <el-button type="primary" class="linkedin-button" @click="loginWithLinkedIn">
        <font-awesome-icon :icon="['fab', 'linkedin']" class="linkedin-icon"/>
        <span>{{ $t('Login with LinkedIn') }}</span>
      </el-button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { toRef, watch } from 'vue'
import { useLogin } from '../compositions/authentication'
import { useSubmitting } from '../compositions/submitting'
import { useRouter } from 'vue-router'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { useAuthConfiguration } from '@/modules/configurations/store/auth-configuration';

const { login, form, isLoggedIn } = useLogin()
const metadata = toRef(useAuthConfiguration(), 'metadata')
const router = useRouter()

const { submit, submitting } = useSubmitting(login, { error: 'Login failed' })

watch(isLoggedIn, (is) => is && router.push({ name: 'home' }))

const onFocus = () => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
}

const loginWithLinkedIn = () => {
  window.location.href = '/api/auth/linkedin';
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
  font-size: 18px;
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
  font-size: 16px;
  border-radius: 6px;
  transition: background 0.3s;
}

.linkedin-button:hover {
  background-color: #005f91;
}

.linkedin-icon {
  font-size: 24px;
  margin-right: 18px;
}
</style>
