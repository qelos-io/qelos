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
import { handleImpersonation } from '../middleware/impersonation'

const router = getRouter()

router
  .get('/api/workspaces', verifyUser, handleImpersonation, onlyAuthenticated, getWorkspaces)
  .get('/api/workspaces/all', verifyUser, handleImpersonation, onlyPrivileged, getEveryWorkspaces)
  .post('/api/workspaces', verifyUser, handleImpersonation, onlyAuthenticated, createWorkspace)
  .put(
    '/api/workspaces/:workspaceId',
    verifyUser,
    handleImpersonation,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    updateWorkspace
  )
  .delete(
    '/api/workspaces/:workspaceId',
    verifyUser,
    handleImpersonation,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    deleteWorkspace
  )
  .get(
    '/api/workspaces/:workspaceId',
    verifyUser,
    handleImpersonation,
    onlyAuthenticated,
    getWorkspaceByParams,
    getWorkspace
  )
  .get(
    '/api/workspaces/:workspaceId/members',
    verifyUser,
    handleImpersonation,
    onlyAuthenticated,
    getWorkspaceByParams,
    onlyWorkspacePrivileged,
    getWorkspaceMembers
  )
  .post('/api/workspaces/:workspaceId/members', verifyUser, handleImpersonation, onlyPrivileged, getWorkspaceByParams, addWorkspaceMember)
  .put('/api/workspaces/:workspaceId/members/:userId', verifyUser, handleImpersonation, onlyAuthenticated, getWorkspaceByParams, onlyWorkspacePrivileged, updateWorkspaceMember)
  .delete('/api/workspaces/:workspaceId/members/:userId', verifyUser, handleImpersonation, onlyAuthenticated, getWorkspaceByParams, onlyWorkspacePrivileged, deleteWorkspaceMember)
  .get('/api/workspaces/:workspaceId/encrypted', verifyUser, handleImpersonation, onlyPrivileged, getWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/encrypted', verifyUser, handleImpersonation, onlyPrivileged, setWorkspaceEncryptedData)
  .post('/api/workspaces/:workspaceId/activate', verifyUser, handleImpersonation, onlyAuthenticated, getWorkspaceByParams, activateWorkspace)

router
  .get('/internal-api/workspaces', verifyInternalCall, getEveryWorkspaces)
export default router;