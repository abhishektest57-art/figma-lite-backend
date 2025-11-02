// middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const status = err.status || 500;
  const code   = err.code   || 'INTERNAL';
  const message = err.message || 'Server error';
  res.status(status).json({ code, message, details: err.details || null });
}
