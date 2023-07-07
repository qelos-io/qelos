import {getRouter} from '@qelos/api-kit'
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceByParams, getWorkspaces
} from '../controllers/workspace'
import verifyUser from '../middleware/verify-user'
import {onlyAuthenticated} from '../middleware/auth-check'

const router = getRouter()

router
  .get('/api/workspaces', verifyUser, onlyAuthenticated, getWorkspaces)
  .post('/api/workspaces', verifyUser, onlyAuthenticated, createWorkspace)
  .put('/api/workspaces/:workspaceId', verifyUser, onlyAuthenticated, getWorkspaceByParams, updateWorkspace)
  .delete('/api/workspaces/:workspaceId', verifyUser, onlyAuthenticated, getWorkspaceByParams, deleteWorkspace)
  .get('/api/workspaces/:workspaceId', verifyUser, onlyAuthenticated, getWorkspace)
export default router;