import { getCrud } from './crud'
import {IUser} from '@/modules/core/store/types/user';

const usersService = getCrud<IUser>('/api/users')

export default usersService
