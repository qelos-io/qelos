import { useConfirmAction } from '../../core/compositions/confirm-action';
import usersService from '../../../services/apis/users-service';
import { useDispatcher } from '../../core/compositions/dispatcher';
import { useSubmitting } from '../../core/compositions/submitting';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { authStore } from '@/modules/core/store/auth';
import { impersonateUser } from '@/services/sdk';
import { buildUsersView } from '../services/user-presentation';
import { getUserDisplayName } from '../services/display-name';
import { IUser } from '@/modules/core/store/types/user';

export function useEditUsers(userId: string | string[]) {
  const { result: user, retry } = useDispatcher<IUser>(() => usersService.getOne(userId as string));
  const { submit, submitting } = useSubmitting(
    (payload) => usersService.update(userId as string, payload),
    {
      success: 'User updated successfully',
      error: 'Failed to update user',
    }
  );
  
  const refreshUser = async () => {
    await retry();
  };
  
  return {
    user,
    updateUser: submit,
    submitting,
    refreshUser,
  };
}

export function useCreateUser() {
  const { submit, submitting } = useSubmitting(usersService.create, {
    success: 'User created successfully',
    error: 'Failed to create user',
  });
  return {
    createUser: submit,
    submitting,
  };
}

export function useRemoveUser(onSuccess: (id: string) => void) {
  const { submit, submitting: removing } = useSubmitting(
    (id: string) => usersService.remove(id).then(() => onSuccess(id)),
    {
      success: 'User removed successfully',
      error: 'Failed to remove user',
    }
  );

  return {
    remove: useConfirmAction((user: IUser) => submit(user._id)),
    removing,
  };
}

export function useUsersList() {
  const route = useRoute();
  const router = useRouter();

  const roles = computed(() => (route.query.roles ? (route.query.roles as string).split(',') : []));
  const query = computed(() => (route.query.q ? String(route.query.q) : ''));

  // the list is loaded once; searching and filtering by role happen on it, so typing is instant
  const failed = ref(false);
  const { result: users, retry, loading } = useDispatcher<IUser[]>(
    () =>
      usersService.getAll().then(
        (list) => ((failed.value = false), list),
        () => ((failed.value = true), []),
      ),
    [],
  );

  const view = computed(() => buildUsersView(users.value || [], { query: query.value, roles: roles.value }));

  function setRoles(next: string[]) {
    router.push({ query: { ...route.query, roles: next.length ? next.join(',') : undefined } });
  }

  function removeUser(userId: string) {
    users.value = users.value.filter((user) => user._id !== userId);
  }

  return { users, view, roles, query, loading, failed, setRoles, removeUser, reload: retry };
}

/** sign in as another user: the page reloads to apply it */
export function useImpersonation() {
  const { t } = useI18n();
  return (user: Pick<IUser, '_id' | 'firstName' | 'lastName' | 'username' | 'email' | 'fullName'>) => {
    if (user._id === authStore.user?._id) {
      ElMessage.warning(t('Cannot impersonate yourself'));
      return;
    }
    const name = getUserDisplayName(user);
    impersonateUser({ _id: user._id, name, email: user.email || user.username });
    ElMessage.success(t('Now signed in as {name}', { name }));
    setTimeout(() => window.location.reload(), 500);
  };
}
