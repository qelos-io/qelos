import { getRouter, verifyInternalCall } from '@qelos/api-kit'
import {
  getUsersForAdmin,
  getUsers,
  createUser,
  getUser,
  updateUser,
  removeUser,
  getUserEncryptedData,
  setUserEncryptedData,
  getUsersStats
} from '../controllers/users'
import verifyUser from '../middleware/verify-user'
import { onlyPrivileged } from '../middleware/auth-check'
import { authConfigCheck } from '../middleware/auth-config-check';

const router = getRouter()

router
  .get('/api/users', verifyUser, onlyPrivileged, getUsers)
  .post('/api/users', verifyUser, onlyPrivileged, authConfigCheck, createUser)
  .post('/api/users/:userId/encrypted', verifyUser, onlyPrivileged, setUserEncryptedData)
  .get('/api/users/stats', verifyUser, onlyPrivileged, getUsersStats)
  .get('/api/users/:userId', verifyUser, onlyPrivileged, getUser)
  .get('/api/users/:userId/encrypted', verifyUser, onlyPrivileged, getUserEncryptedData)
  .put('/api/users/:userId', verifyUser, onlyPrivileged, authConfigCheck, updateUser)
  .delete('/api/users/:userId', verifyUser, onlyPrivileged, removeUser);

const internalVerify: any = verifyInternalCall;

router
  .get('/internal-api/users', internalVerify, getUsersForAdmin)
  .post('/internal-api/users', internalVerify, authConfigCheck, createUser)
  .get('/internal-api/users/:userId', internalVerify, (req: any, _, next) => {
    req.userPayload = req.user;
    next();
  }, getUser)
  .put('/internal-api/users/:userId', internalVerify, authConfigCheck, updateUser)
  .delete('/internal-api/users/:userId', internalVerify, removeUser);


export default router;
