import { getRouter } from '@qelos/api-kit'
import users from '../controllers/users'
import verifyUser from '../middleware/verify-user'
import { onlyPrivileged } from '../middleware/auth-check'
import { authConfigCheck } from '../middleware/auth-config-check';

const {
  getUsersForAdmin,
  getUsers,
  createUser,
  getUser,
  updateUser,
  removeUser,
  getUserEncryptedData,
  setUserEncryptedData
} = users
const router = getRouter()

router
  .get('/api/users', verifyUser, onlyPrivileged, getUsers)
  .post('/api/users', verifyUser, onlyPrivileged, authConfigCheck, createUser)
  .post('/api/users/:userId/encrypted', verifyUser, onlyPrivileged, setUserEncryptedData)
  .get('/api/users/:userId', verifyUser, onlyPrivileged, getUser)
  .get('/api/users/:userId/encrypted', verifyUser, onlyPrivileged, getUserEncryptedData)
  .put('/api/users/:userId', verifyUser, onlyPrivileged, authConfigCheck, updateUser)
  .delete('/api/users/:userId', verifyUser, onlyPrivileged, removeUser);

router
  .get('/internal-api/users', getUsersForAdmin)
  .post('/internal-api/users', authConfigCheck, createUser)
  .get('/internal-api/users/:userId', (req, _, next) => {
    req.user = {
      type: 'internal',
      isPrivileged: true,
    };
    next();
  }, getUser)
  .put('/internal-api/users/:userId', authConfigCheck, updateUser)
  .delete('/internal-api/users/:userId', removeUser);


export default router;
