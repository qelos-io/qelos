import { AuthRequest } from '../../../types';
import { DecryptedSourceAuthentication, getIntegrationSource } from '../../services/integration-source';

type AuthWithLinkedinRequest = AuthRequest & { source: DecryptedSourceAuthentication };

export async function getLinkedinSource(req: AuthWithLinkedinRequest, res, next) {
  if (!req.authConfig.socialLoginsSources?.linkedin) {
    res.status(400).end('linkedin social login is not enabled');
    return;
  }
  const source = await getIntegrationSource(req.headers.tenant, req.authConfig.socialLoginsSources.linkedin);
  if (!source) {
    res.status(400).end('linkedin social login is not enabled');
    return;
  }
  req.source = source;
  next();
}

export async function loginWithLinkedIn(req: AuthWithLinkedinRequest, res) {
  res.status(400).end('linkedin social login is not enabled');
}

export async function authCallbackFromLinkedIn(req: AuthWithLinkedinRequest, res) {
  res.status(400).end('linkedin social login is not enabled');
}