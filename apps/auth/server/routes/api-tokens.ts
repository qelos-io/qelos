import { getRouter } from '@qelos/api-kit';
import verifyUser from '../middleware/verify-user';
import { onlyAuthenticated } from '../middleware/auth-check';
import { authConfigCheck } from '../middleware/auth-config-check';
import { Response } from 'express';
import { AuthRequest } from '../../types';
import {
  createApiToken,
  listApiTokens,
  deleteApiToken,
  isUserPermittedToManageTokens,
} from '../services/api-tokens';

const router = getRouter();

function rejectTokenAuth(req: AuthRequest, res: Response, next: Function) {
  if (req.userPayload?.isApiToken) {
    return res.status(403).json({
      message: 'API token management is not allowed via token authentication',
    }).end();
  }
  next();
}

function apiTokenPermissionCheck(req: AuthRequest, res: Response, next: Function) {
  const wsRoles = req.activeWorkspace?.roles;
  if (!isUserPermittedToManageTokens(req.userPayload.roles, req.authConfig, wsRoles)) {
    return res.status(403).json({
      message: 'You do not have permission to manage API tokens',
    }).end();
  }
  next();
}

router.get(
  '/api/me/api-tokens',
  verifyUser,
  onlyAuthenticated,
  rejectTokenAuth,
  authConfigCheck,
  apiTokenPermissionCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const tokens = await listApiTokens(
        req.headers.tenant,
        req.userPayload.sub
      );
      res.status(200).json(tokens);
    } catch (error) {
      res.status(500).json({ message: 'Failed to list API tokens' });
    }
  }
);

router.post(
  '/api/me/api-tokens',
  verifyUser,
  onlyAuthenticated,
  rejectTokenAuth,
  authConfigCheck,
  apiTokenPermissionCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const { nickname, workspace, expiresAt } = req.body;

      if (!nickname || !expiresAt) {
        return res.status(400).json({
          message: 'nickname and expiresAt are required',
        });
      }

      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        return res.status(400).json({
          message: 'expiresAt must be a valid future date',
        });
      }

      const result = await createApiToken(
        req.headers.tenant,
        req.userPayload.sub,
        workspace || null,
        nickname,
        expDate
      );

      res.status(201).json({
        token: result.rawToken,
        apiToken: result.apiToken,
      });
    } catch (error: any) {
      if (error.code === 'MAX_TOKENS_REACHED') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to create API token' });
    }
  }
);

router.delete(
  '/api/me/api-tokens/:tokenId',
  verifyUser,
  onlyAuthenticated,
  rejectTokenAuth,
  authConfigCheck,
  apiTokenPermissionCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await deleteApiToken(
        req.headers.tenant,
        req.userPayload.sub,
        req.params.tokenId
      );
      if (!deleted) {
        return res.status(404).json({ message: 'Token not found' });
      }
      res.status(200).json({ message: 'Token revoked' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete API token' });
    }
  }
);

export default router;
