import {getRouter} from '@qelos/api-kit'
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceByParams,
  getWorkspaces,
  onlyWorkspacePrivileged,
  activateWorkspace,
  getWorkspaceMembers,
  getEveryWorkspaces,
  getWorkspaceEncryptedData, setWorkspaceEncryptedData
} from '../controllers/workspace'
import verifyUser from '../middleware/verify-user'
import { onlyAuthenticated, onlyPrivileged } from '../middleware/auth-check'

const router = getRouter()

router
  .get('/api/workspaces', verifyUser, onlyAuthenticated, getWorkspaces)
  .get('/api/workspaces/all', verifyUser, onlyPrivileged, getEveryWorkspaces)
  .post('/api/workspaces', verifyUser, onlyAuthenticated, createWorkspace)
  .put(
    '/api/workspaces/:workspaceId',
    verifyUser,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    updateWorkspace
  )
  .delete(
    '/api/workspaces/:workspaceId',
    verifyUser,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    deleteWorkspace
  )
  .get(
    '/api/workspaces/:workspaceId',
    verifyUser,
    onlyAuthenticated,
    getWorkspaceByParams,
    getWorkspace
  )
  .get(
    '/api/workspaces/:workspaceId/members',
    verifyUser,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    getWorkspaceMembers
  )
  .get('/api/workspaces/:workspaceId/encrypted', verifyUser, onlyPrivileged, getWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/encrypted', verifyUser, onlyPrivileged, setWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/activate', verifyUser, onlyAuthenticated, getWorkspaceByParams, activateWorkspace)
export default router;