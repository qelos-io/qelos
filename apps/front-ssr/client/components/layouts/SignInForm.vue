<template>
  <form class="sign-in-form" @submit.prevent="signIn">
    <label>
      <span class="email-label">{{ emailLabel }}</span>
      <input class="email-input" v-model="email"/>
    </label>
    <label>
      <span class="password-label">{{ passwordLabel }}</span>
      <input class="password-input" v-model="password" type="password"/>
    </label>
    <div class="submit-wrapper">
      <button type="submit">{{ submitLabel }}</button>
    </div>
  </form>
</template>
<script lang="ts" setup>
import {ref} from 'vue';
import sdk from '../../services/sdk';

defineProps({
  emailLabel: {
    type: String,
    default: 'Email'
  },
  passwordLabel: {
    type: String,
    default: 'Password'
  },
  submitLabel: {
    type: String,
    default: 'Sign In'
  }
})

const email = ref('')
const password = ref('')

async function signIn() {
  await sdk.authentication.signin({email: email.value, password: password.value});
  location.href = location.origin + '/gp-admin/';
}
</script>
