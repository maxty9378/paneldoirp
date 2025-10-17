import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Генерируем уникальный ID для каждого запроса для корреляции логов
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

