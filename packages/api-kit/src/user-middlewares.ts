import type { Response, NextFunction } from 'express';

import type { RequestWithUser } from './types';

export function populateUser(req: RequestWithUser, res: Response, next: NextFunction): void {
  try {
    req.user = req.headers.user ? JSON.parse(req.headers.user as string) : null;
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

