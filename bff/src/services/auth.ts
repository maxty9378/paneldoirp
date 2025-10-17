import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Создаем клиент Supabase с anon key для auth операций
const supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface MagicLinkRequest {
  email: string;
  redirectTo?: string;
}

export interface AuthResponse {
  user: any;
  session: any;
}

export class AuthService {
  /**
   * Вход по email и паролю
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        logger.error({ error, email: credentials.email }, 'Ошибка входа');
        throw error;
      }

      logger.info({ userId: data.user?.id, email: credentials.email }, 'Успешный вход');
      return data;
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.signIn');
      throw error;
    }
  }

  /**
   * Отправка magic link
   */
  async sendMagicLink(request: MagicLinkRequest): Promise<void> {
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: request.email,
        options: {
          emailRedirectTo: request.redirectTo || `${config.cors.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error({ error, email: request.email }, 'Ошибка отправки magic link');
        throw error;
      }

      logger.info({ email: request.email }, 'Magic link отправлен');
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.sendMagicLink');
      throw error;
    }
  }

  /**
   * Обмен magic link токена на сессию
   */
  async verifyMagicLink(token: string, type: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        token_hash: token,
        type: type as any,
      });

      if (error) {
        logger.error({ error }, 'Ошибка верификации magic link');
        throw error;
      }

      logger.info({ userId: data.user?.id }, 'Magic link успешно верифицирован');
      return data;
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.verifyMagicLink');
      throw error;
    }
  }

  /**
   * Обновление токена по refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabaseClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.error({ error }, 'Ошибка обновления токена');
        throw error;
      }

      logger.info({ userId: data.user?.id }, 'Токен успешно обновлен');
      return data;
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.refreshToken');
      throw error;
    }
  }

  /**
   * Выход из системы
   */
  async signOut(accessToken: string): Promise<void> {
    try {
      // Создаем клиент с токеном пользователя
      const userClient = createClient(config.supabase.url, config.supabase.anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { error } = await userClient.auth.signOut();

      if (error) {
        logger.error({ error }, 'Ошибка выхода');
        throw error;
      }

      logger.info('Успешный выход');
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.signOut');
      throw error;
    }
  }

  /**
   * Получение текущего пользователя по токену
   */
  async getCurrentUser(accessToken: string): Promise<any> {
    try {
      const userClient = createClient(config.supabase.url, config.supabase.anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { data, error } = await userClient.auth.getUser();

      if (error) {
        logger.error({ error }, 'Ошибка получения пользователя');
        throw error;
      }

      // Загружаем профиль из таблицы users
      const { data: profile, error: profileError } = await userClient
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        logger.warn({ error: profileError, userId: data.user.id }, 'Профиль не найден в таблице users');
        // Возвращаем только данные из auth, если профиль не найден
        return data.user;
      }

      // Объединяем данные из auth и профиля
      return {
        ...data.user,
        ...profile,
      };
    } catch (error) {
      logger.error({ error }, 'Ошибка AuthService.getCurrentUser');
      throw error;
    }
  }
}

export const authService = new AuthService();

