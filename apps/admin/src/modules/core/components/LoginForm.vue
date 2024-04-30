<template>
  <el-form class="login-form" @submit.native.prevent="submit">
    <el-form-item :label="$t('Email')" class="form-item-flex">
      <el-input size="large" name="email" v-model="form.email" type="email" required @focus="onFocus" dir="ltr"/>
    </el-form-item>
    <el-form-item :label="$t('Password')" class="form-item-flex">
      <el-input size="large" name="password" v-model="form.password" type="password" required @focus="onFocus"
                dir='ltr'/>
    </el-form-item>
    <div class="form-buttons">
      <SaveButton :submitting="submitting" text="Login"/>
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { watch } from 'vue'
import { useLogin } from '../compositions/authentication'
import { useSubmitting } from '../compositions/submitting'
import { useRouter } from 'vue-router'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';

const { login, form, isLoggedIn } = useLogin()
const router = useRouter()

const { submit, submitting } = useSubmitting(login, { error: 'Login failed' })

watch(isLoggedIn, (is) => is && router.push({ name: 'home' }))

const onFocus = () => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 90%;
  padding: 10px;
  max-width: 500px;
  margin: 0 auto;
}

.form-buttons {
  text-align: end;
}
</style>
