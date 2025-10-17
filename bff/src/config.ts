import dotenv from 'dotenv';

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined, // undefined для работы по IP
    nameAccess: process.env.COOKIE_NAME_ACCESS || 'sb_access',
    nameRefresh: process.env.COOKIE_NAME_REFRESH || 'sb_refresh',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://51.250.94.103',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://51.250.94.103', 'http://localhost:5173'],
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Валидация обязательных переменных
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error(`❌ Отсутствуют обязательные переменные окружения: ${missingVars.join(', ')}`);
  process.exit(1);
}

