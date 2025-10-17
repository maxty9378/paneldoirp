import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { setAuthCookies, clearAuthCookies, getTokensFromCookies } from '../utils/cookies.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * POST /auth/sign-in
 * Вход по email и паролю
 */
router.post('/sign-in', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const authData = await authService.signIn({ email, password });

    if (!authData.session) {
      return res.status(401).json({ error: 'Не удалось создать сессию' });
    }

    // Устанавливаем httpOnly куки
    setAuthCookies(
      res,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_in || 3600
    );

    // Возвращаем данные пользователя (без токенов)
    res.json({
      user: authData.user,
      expiresAt: authData.session.expires_at,
    });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка POST /auth/sign-in');
    res.status(401).json({ error: error.message || 'Ошибка входа' });
  }
});

/**
 * POST /auth/magic-link
 * Отправка magic link
 */
router.post('/magic-link', async (req: Request, res: Response) => {
  try {
    const { email, redirectTo } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    await authService.sendMagicLink({ email, redirectTo });

    res.json({ message: 'Magic link отправлен на email' });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка POST /auth/magic-link');
    res.status(400).json({ error: error.message || 'Ошибка отправки magic link' });
  }
});

/**
 * POST /auth/verify-magic-link
 * Верификация magic link токена
 */
router.post('/verify-magic-link', async (req: Request, res: Response) => {
  try {
    const { token, type } = req.body;

    if (!token || !type) {
      return res.status(400).json({ error: 'Token и type обязательны' });
    }

    const authData = await authService.verifyMagicLink(token, type);

    if (!authData.session) {
      return res.status(401).json({ error: 'Не удалось создать сессию' });
    }

    // Устанавливаем httpOnly куки
    setAuthCookies(
      res,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_in || 3600
    );

    res.json({
      user: authData.user,
      expiresAt: authData.session.expires_at,
    });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка POST /auth/verify-magic-link');
    res.status(401).json({ error: error.message || 'Ошибка верификации magic link' });
  }
});

/**
 * POST /auth/refresh
 * Обновление токена
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = getTokensFromCookies(req);

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token отсутствует' });
    }

    const authData = await authService.refreshToken(refreshToken);

    if (!authData.session) {
      return res.status(401).json({ error: 'Не удалось обновить сессию' });
    }

    // Обновляем httpOnly куки
    setAuthCookies(
      res,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_in || 3600
    );

    res.json({
      user: authData.user,
      expiresAt: authData.session.expires_at,
    });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка POST /auth/refresh');
    res.status(401).json({ error: error.message || 'Ошибка обновления токена' });
  }
});

/**
 * POST /auth/sign-out
 * Выход из системы
 */
router.post('/sign-out', async (req: Request, res: Response) => {
  try {
    const { accessToken } = getTokensFromCookies(req);

    if (accessToken) {
      await authService.signOut(accessToken);
    }

    // Очищаем куки
    clearAuthCookies(res);

    res.json({ message: 'Успешный выход' });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка POST /auth/sign-out');
    // Даже если выход не удался, очищаем куки
    clearAuthCookies(res);
    res.json({ message: 'Сессия очищена' });
  }
});

/**
 * GET /auth/me
 * Получение текущего пользователя
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const { accessToken } = getTokensFromCookies(req);

    if (!accessToken) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const user = await authService.getCurrentUser(accessToken);

    res.json({ user });
  } catch (error: any) {
    logger.error({ error }, 'Ошибка GET /auth/me');
    res.status(401).json({ error: error.message || 'Ошибка получения пользователя' });
  }
});

export default router;

