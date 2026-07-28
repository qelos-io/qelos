import express from 'express';
import { getRouter } from '@qelos/api-kit';
import verifyUser from '../middleware/verify-user';
import { onlyAuthenticated } from '../middleware/auth-check';
import { mcpConfigCheck } from '../middleware/mcp-config-check';
import { mcpAuthorize } from '../controllers/mcp-oauth/authorize';
import { mcpConsent } from '../controllers/mcp-oauth/consent';
import { mcpToken } from '../controllers/mcp-oauth/token';
import { mcpOAuthDiscovery } from '../controllers/mcp-oauth/oauth-discovery';
import { mcpClientRegister } from '../controllers/mcp-oauth/register';

const router = getRouter();
const urlencodedParser = express.urlencoded({ extended: false });
const jsonParser = express.json();

router
  .get('/.well-known/oauth-authorization-server', mcpConfigCheck, mcpOAuthDiscovery)
  .post('/.well-known/oauth-authorization-server/register', mcpConfigCheck, jsonParser, mcpClientRegister)
  .get('/api/auth/mcp/authorize', mcpConfigCheck, verifyUser, mcpAuthorize)
  .post('/api/auth/mcp/consent', mcpConfigCheck, verifyUser, onlyAuthenticated, urlencodedParser, mcpConsent)
  .post('/api/auth/mcp/token', mcpConfigCheck, urlencodedParser, mcpToken);

export default router;
