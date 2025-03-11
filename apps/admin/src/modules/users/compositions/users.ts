import { useConfirmAction } from '../../core/compositions/confirm-action';
import usersService from '../../../services/users-service';
import { useDispatcher } from '../../core/compositions/dispatcher';
import { useSubmitting } from '../../core/compositions/submitting';
import { useRoute, useRouter } from 'vue-router';
import { computed, Ref, watch } from 'vue';
import { IUser } from '@/modules/core/store/types/user';

export function useEditUsers(userId) {
  const { result: user } = useDispatcher<IUser>(() => usersService.getOne(userId));
  const { submit, submitting } = useSubmitting(
    (payload) => usersService.update(userId, payload),
    {
      success: 'User updated successfully',
      error: 'Failed to update user',
    }
  );
  return {
    user,
    updateUser: submit,
    submitting,
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

export function useRemoveUser(onSuccess) {
  const { submit, submitting: removing } = useSubmitting(
    (id) => usersService.remove(id).then(() => onSuccess(id)),
    {
      success: 'User removed successfully',
      error: 'Failed to remove user',
    }
  );

  return {
    remove: useConfirmAction((user) => submit(user._id)),
    removing,
  };
}

export function useUsersList() {
  const route = useRoute();
  const router = useRouter();

  // Reading role parameters from query
  const roles = computed(() => route.query.roles ? (route.query.roles as string).split(',') : []);

  // Function to update query parameters
  function updateRoles(newRoles: string[]) {
    router.push({
      query: {
        ...route.query,
        roles: newRoles.length ? newRoles.join(',') : undefined
      }
    });
  }

  const { result: users, retry, loading } = useDispatcher<IUser[]>(
    () => usersService.getAll({
      username: route.query.q || undefined,
      roles: roles.value.length ? roles.value.join(',') : undefined,
    }),
    []
  );

  // Computed property to filter users based on selected roles
  const filteredUsers = computed(() => {
    if (roles.value.length === 0) return users.value;
    return users.value.filter(user =>
      user.roles.some(role => roles.value.includes(role))
    );
  });


  function removeUser(userId: string) {
    users.value = users.value.filter((user) => user._id !== userId);
  }

  // Watch for changes in query parameters `q` and `roles`
  watch([() => route.query.q, roles], retry);

  return { users, filteredUsers, loading, updateRoles, removeUser };
}

