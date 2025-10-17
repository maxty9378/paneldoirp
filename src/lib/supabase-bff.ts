/**
 * Supabase BFF Client
 * Клиент для работы с Supabase через BFF (Backend-for-Frontend)
 * 
 * Преимущества:
 * - Обход блокировок провайдеров (МТС)
 * - Безопасное хранение токенов в httpOnly-куках
 * - Маскировка прямых обращений к *.supabase.co
 */

const BFF_URL = 'http://51.250.94.103:3000';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface AuthResponse {
  user: User;
  expiresAt?: number;
}

export interface MagicLinkRequest {
  email: string;
  redirectTo?: string;
}

export interface MagicLinkVerify {
  token: string;
  type: 'email' | 'sms';
}

/**
 * BFF Auth Client
 */
class BFFAuthClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Вход по email и паролю
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Важно для отправки/получения кук
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка входа');
    }

    return response.json();
  }

  /**
   * Отправка magic link
   */
  async sendMagicLink(request: MagicLinkRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка отправки magic link');
    }
  }

  /**
   * Верификация magic link
   */
  async verifyMagicLink(verify: MagicLinkVerify): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(verify),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка верификации magic link');
    }

    return response.json();
  }

  /**
   * Обновление токена
   */
  async refreshToken(): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка обновления токена');
    }

    return response.json();
  }

  /**
   * Выход
   */
  async signOut(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка выхода');
    }
  }

  /**
   * Получение текущего пользователя
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка получения пользователя');
    }

    const data = await response.json();
    return data.user;
  }
}

/**
 * BFF REST Client
 */
class BFFRestClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Выполняет REST запрос к Supabase через BFF
   */
  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/rest${path}`;
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Важно для отправки кук
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка запроса' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Если ответ пустой, возвращаем null
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as T;
    }

    return response.json();
  }

  /**
   * GET запрос
   */
  async get<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST запрос
   */
  async post<T = any>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT запрос
   */
  async put<T = any>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH запрос
   */
  async patch<T = any>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE запрос
   */
  async delete<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

/**
 * BFF Storage Client
 */
class BFFStorageClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Выполняет Storage запрос к Supabase через BFF
   */
  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/storage${path}`;
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка запроса' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Для бинарных данных возвращаем blob
    if (options.headers?.['Accept']?.includes('application/octet-stream') || 
        options.headers?.['Accept']?.includes('*/*')) {
      return response.blob() as T;
    }

    return response.json();
  }

  /**
   * Получить файл
   */
  async getFile(bucket: string, path: string): Promise<Blob> {
    return this.request<Blob>(`/object/${bucket}/${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream',
      },
    });
  }

  /**
   * Загрузить файл
   */
  async uploadFile(bucket: string, path: string, file: File | Blob): Promise<any> {
    return this.request(`/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
  }

  /**
   * Удалить файл
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    await this.request(`/object/${bucket}/${path}`, {
      method: 'DELETE',
    });
  }

  /**
   * Список файлов в bucket
   */
  async listFiles(bucket: string, path: string = ''): Promise<any> {
    return this.request(`/object/list/${bucket}`, {
      method: 'POST',
      body: JSON.stringify({ prefix: path }),
    });
  }
}

/**
 * BFF Functions Client
 */
class BFFFunctionsClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Вызов Edge Function
   */
  async invoke<T = any>(functionName: string, body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}/functions/${functionName}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка вызова функции' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Главный BFF клиент
 */
export class BFFClient {
  public auth: BFFAuthClient;
  public rest: BFFRestClient;
  public storage: BFFStorageClient;
  public functions: BFFFunctionsClient;

  constructor(baseUrl: string = BFF_URL) {
    this.auth = new BFFAuthClient(baseUrl);
    this.rest = new BFFRestClient(baseUrl);
    this.storage = new BFFStorageClient(baseUrl);
    this.functions = new BFFFunctionsClient(baseUrl);
  }
}

// Экспортируем singleton instance
export const bffClient = new BFFClient();

// Экспортируем отдельные клиенты для удобства
export const bffAuth = bffClient.auth;
export const bffRest = bffClient.rest;
export const bffStorage = bffClient.storage;
export const bffFunctions = bffClient.functions;

