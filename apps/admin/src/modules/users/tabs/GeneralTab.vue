<template>
  <UserEditor :user="user" mode="self" :submitting="submitting" :save="save" />
</template>

<script lang="ts" setup>
import type { IUser } from '@/modules/core/store/types/user';
import { updateProfile } from '@/modules/core/store/auth';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import UserEditor from '../components/UserEditor.vue';

defineProps<{ user: IUser; userId?: string }>();

const { submit, submitting } = useSubmitting((payload: Record<string, unknown>) => updateProfile(payload).then(() => true), {
  success: 'Your profile has been updated.',
  error: 'Failed to update your profile',
});

const save = (payload: Record<string, unknown>) => submit(payload);
</script>
