import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { logger } from './logger.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggerMiddleware } from './middleware/logger.js';
import authRoutes from './routes/auth.js';
import proxyRoutes from './routes/proxy.js';
import healthRoutes from './routes/health.js';

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Парсинг тела запроса
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Парсинг кук
app.use(cookieParser());

// CORS
app.use(corsMiddleware);

// Request ID для корреляции логов
app.use(requestIdMiddleware);

// Логирование
app.use(loggerMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use(proxyRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn({ path: req.path }, '404 - маршрут не найден');
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, path: req.path }, 'Необработанная ошибка');
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера',
    ...(config.server.env === 'development' && { stack: err.stack }),
  });
});

// Запуск сервера
const port = config.server.port;

app.listen(port, () => {
  logger.info({
    port,
    env: config.server.env,
    supabaseUrl: config.supabase.url,
    cookieDomain: config.cookie.domain,
    corsOrigin: config.cors.origin,
  }, '🚀 BFF сервер запущен');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Получен SIGTERM, завершаем работу...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Получен SIGINT, завершаем работу...');
  process.exit(0);
});

