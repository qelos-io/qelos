import { Response, NextFunction } from 'express';

export function onlyAuthenticated(req, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'authentication required' }).end();
    return;
  }
  next();
}

export function onlyPrivileged(req, res: Response, next: NextFunction) {
  if (!req.user?.isPrivileged) {
    const message = req.user ? 'insufficient permissions' : 'authentication required';
    res.status(401).json({ message }).end();
    return;
  }
  next();
}
