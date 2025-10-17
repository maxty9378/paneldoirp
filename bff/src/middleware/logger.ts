import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string;

  // Логируем входящий запрос
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  }, 'Входящий запрос');

  // Перехватываем ответ для логирования
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Ошибка сервера');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Ошибка клиента');
    } else {
      logger.info(logData, 'Запрос выполнен');
    }
  });

  next();
};

