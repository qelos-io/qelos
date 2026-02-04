import type { Response, NextFunction } from 'express';
import type { RequestWithUser } from './types';

export function populateUser(req: RequestWithUser, res: Response, next: NextFunction): void {
  try {
    if (req.headers.user) {
      // Check if the user header is Base64 encoded (to handle non-ASCII characters)
      const userHeader = req.headers.user as string;
      let userJson: string;
      
      try {
        // Try to decode from Base64 first
        userJson = Buffer.from(userHeader, 'base64').toString('utf8');
      } catch {
        // If decoding fails, assume it's plain JSON (for backward compatibility)
        userJson = userHeader;
      }
      
      req.user = JSON.parse(userJson);
    } else {
      req.user = null;
    }
    req.workspace = req.user?.workspace;
    next();
  } catch (e) {
    res.status(400).json({ code: 'INVALID_USER' }).end();
  }
}

export function verifyUser(req: RequestWithUser, res: Response, next: NextFunction): void {
  if (req.user) {
    next();
  } else {
    res.status(401).end();
  }
}

export function verifyInternalCall(req, res: Response, next: NextFunction): void {
  if (
    !req.headers.internal_secret || 
    req.headers.internal_secret !== process.env.INTERNAL_SECRET || 
    !req.headers.tenant
  ) {
    return res.status(401).end();
  }

  req.user = {
    type: 'internal',
    isPrivileged: true,
    roles: ['admin'],
    tenant: req.headers.tenant,
  };
  next();
}