import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) {
      return callback(null, true);
    }

    // Проверяем, что origin в списке разрешенных
    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({ origin }, 'CORS: заблокирован запрос с неподдерживаемого origin');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'x-client-info', 'accept-profile', 'apikey'],
  exposedHeaders: ['X-Request-ID'],
});

