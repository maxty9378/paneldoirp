import { Request, Response, NextFunction } from 'express';
import { getTokensFromCookies } from '../utils/cookies.js';
import { authService } from '../services/auth.js';
import { logger } from '../logger.js';

/**
 * Middleware для проверки авторизации
 * Автоматически обновляет токен, если он истек
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken, refreshToken } = getTokensFromCookies(req);

    if (!accessToken) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Проверяем токен
    try {
      await authService.getCurrentUser(accessToken);
      // Токен валиден, добавляем его в запрос
      req.accessToken = accessToken;
      next();
    } catch (error) {
      // Токен истек, пытаемся обновить
      logger.info('Access token истек, пытаемся обновить');

      if (!refreshToken) {
        return res.status(401).json({ error: 'Сессия истекла' });
      }

      try {
        const authData = await authService.refreshToken(refreshToken);

        if (!authData.session) {
          return res.status(401).json({ error: 'Не удалось обновить сессию' });
        }

        // Обновляем куки
        const { setAuthCookies } = await import('../utils/cookies.js');
        setAuthCookies(
          res,
          authData.session.access_token,
          authData.session.refresh_token,
          authData.session.expires_in || 3600
        );

        // Добавляем новый токен в запрос
        req.accessToken = authData.session.access_token;
        next();
      } catch (refreshError) {
        logger.error({ refreshError }, 'Ошибка обновления токена');
        return res.status(401).json({ error: 'Сессия истекла' });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Ошибка auth middleware');
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Расширяем тип Request для добавления accessToken
declare global {
  namespace Express {
    interface Request {
      accessToken?: string;
    }
  }
}

