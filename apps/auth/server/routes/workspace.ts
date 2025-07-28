import { getRouter, verifyInternalCall } from '@qelos/api-kit'
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
  addWorkspaceMember,
  deleteWorkspaceMember,
  updateWorkspaceMember,
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
  .post('/api/workspaces/:workspaceId/members', verifyUser, onlyPrivileged, getWorkspaceByParams, addWorkspaceMember)
  .put('/api/workspaces/:workspaceId/members/:userId', verifyUser, onlyAuthenticated, getWorkspaceByParams, onlyWorkspacePrivileged, updateWorkspaceMember)
  .delete('/api/workspaces/:workspaceId/members/:userId', verifyUser, onlyAuthenticated, getWorkspaceByParams, onlyWorkspacePrivileged, deleteWorkspaceMember)
  .get('/api/workspaces/:workspaceId/encrypted', verifyUser, onlyPrivileged, getWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/encrypted', verifyUser, onlyPrivileged, setWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/activate', verifyUser, onlyAuthenticated, getWorkspaceByParams, activateWorkspace)

router
  .get('/internal-api/workspaces', verifyInternalCall, getEveryWorkspaces)
export default router;