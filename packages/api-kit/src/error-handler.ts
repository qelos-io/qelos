import type { Request, Response, NextFunction } from 'express';
import { ResponseError } from './response-error';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    console.error(`[${req.method}] ${req.path} — error after headers sent:`, err);
    res.end();
    return;
  }

  if (err instanceof ResponseError) {
    return res.status(err.status).json({
      message: err.responseMessage,
      code: err.status,
    }).end();
  }

  console.error(`[${req.method}] ${req.path} — unhandled error:`, err);

  return res.status(500).json({
    message: 'Internal server error',
    code: 500,
  }).end();
}
