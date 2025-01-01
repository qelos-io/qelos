import usersService from '../../../services/users-service';
import { useDispatcher } from '../../core/compositions/dispatcher';

export function useUsersStats() {
  const { result: stats, loading } = useDispatcher<{ users: number, workspaces: number }>(
    () => usersService.getOne('stats')
  );
  return { stats, loading };
}

