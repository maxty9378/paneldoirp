import { Response } from 'express';
import { config } from '../config.js';

/**
 * Устанавливает httpOnly куки с токенами
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  // Устанавливаем access token
  const cookieOptions: any = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: expiresIn * 1000, // Конвертируем секунды в миллисекунды
    path: '/',
  };
  
  if (config.cookie.domain) {
    cookieOptions.domain = config.cookie.domain;
  }
  
  res.cookie(config.cookie.nameAccess, accessToken, cookieOptions);

  // Устанавливаем refresh token (более долгоживущий)
  const refreshCookieOptions: any = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    path: '/',
  };
  
  if (config.cookie.domain) {
    refreshCookieOptions.domain = config.cookie.domain;
  }
  
  res.cookie(config.cookie.nameRefresh, refreshToken, refreshCookieOptions);
}

/**
 * Очищает auth куки
 */
export function clearAuthCookies(res: Response): void {
  const clearOptions: any = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  };
  
  if (config.cookie.domain) {
    clearOptions.domain = config.cookie.domain;
  }
  
  res.clearCookie(config.cookie.nameAccess, clearOptions);
  res.clearCookie(config.cookie.nameRefresh, clearOptions);
}

/**
 * Извлекает токены из кук
 */
export function getTokensFromCookies(req: any): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: req.cookies?.[config.cookie.nameAccess] || null,
    refreshToken: req.cookies?.[config.cookie.nameRefresh] || null,
  };
}

