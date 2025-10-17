import dotenv from 'dotenv';

dotenv.config();

const serverEnv = (process.env.NODE_ENV || 'development').trim();
const corsOrigin = (process.env.CORS_ORIGIN || 'http://51.250.94.103').trim();

const allowedOriginsFromEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const defaultDevOrigins =
  serverEnv === 'development'
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
    : [];

const corsAllowedOrigins = Array.from(
  new Set<string>([corsOrigin, ...allowedOriginsFromEnv, ...defaultDevOrigins]),
);

const cookieSameSite =
  (process.env.COOKIE_SAME_SITE?.toLowerCase() as 'lax' | 'strict' | 'none') || 'lax';

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    nameAccess: process.env.COOKIE_NAME_ACCESS || 'sb_access',
    nameRefresh: process.env.COOKIE_NAME_REFRESH || 'sb_refresh',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: cookieSameSite,
  },
  cors: {
    origin: corsOrigin,
    allowedOrigins: corsAllowedOrigins,
  },
  server: {
    port: Number.parseInt(process.env.PORT || '3000', 10),
    env: serverEnv,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}
