import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * Прокси для Supabase REST API
 * GET /rest/*
 */
const restProxy = createProxyMiddleware({
  target: config.supabase.url,
  changeOrigin: true,
  pathRewrite: {
    '^/rest': '/rest/v1', // Добавляем /v1 к пути
  },
  on: {
    proxyReq: (proxyReq: any, req: Request) => {
      // Добавляем заголовки Supabase
      proxyReq.setHeader('apikey', config.supabase.anonKey);
      proxyReq.setHeader('Authorization', `Bearer ${req.accessToken || config.supabase.anonKey}`);
      
      // Добавляем Prefer заголовок для возврата данных после вставки/обновления
      if (req.headers.prefer) {
        proxyReq.setHeader('Prefer', req.headers.prefer as string);
      }

      logger.debug({
        method: req.method,
        path: req.path,
        target: `${config.supabase.url}${proxyReq.path}`,
      }, 'Проксируем REST запрос');
    },
    proxyRes: (proxyRes: any, req: Request) => {
      logger.debug({
        status: proxyRes.statusCode,
        path: req.path,
      }, 'REST ответ получен');
    },
    error: (err: any, req: Request) => {
      logger.error({ err, path: req.path }, 'Ошибка REST прокси');
    },
  },
} as any);

router.use('/rest', authMiddleware, restProxy);

/**
 * Прокси для Supabase Storage
 * GET /storage/*
 */
const storageProxy = createProxyMiddleware({
  target: config.supabase.url,
  changeOrigin: true,
  pathRewrite: {
    '^/storage': '/storage/v1', // Добавляем /v1 к пути
  },
  on: {
    proxyReq: (proxyReq: any, req: Request) => {
      // Добавляем заголовки Supabase
      proxyReq.setHeader('apikey', config.supabase.anonKey);
      proxyReq.setHeader('Authorization', `Bearer ${req.accessToken || config.supabase.anonKey}`);

      logger.debug({
        method: req.method,
        path: req.path,
        target: `${config.supabase.url}${proxyReq.path}`,
      }, 'Проксируем Storage запрос');
    },
    proxyRes: (proxyRes: any, req: Request) => {
      logger.debug({
        status: proxyRes.statusCode,
        path: req.path,
      }, 'Storage ответ получен');
    },
    error: (err: any, req: Request) => {
      logger.error({ err, path: req.path }, 'Ошибка Storage прокси');
    },
  },
} as any);

router.use('/storage', authMiddleware, storageProxy);

/**
 * Прокси для Supabase Edge Functions
 * GET /functions/*
 */
const functionsProxy = createProxyMiddleware({
  target: config.supabase.url,
  changeOrigin: true,
  pathRewrite: {
    '^/functions': '/functions/v1',
  },
  on: {
    proxyReq: (proxyReq: any, req: Request) => {
      // Добавляем заголовки Supabase
      proxyReq.setHeader('apikey', config.supabase.anonKey);
      proxyReq.setHeader('Authorization', `Bearer ${req.accessToken || config.supabase.anonKey}`);

      logger.debug({
        method: req.method,
        path: req.path,
        target: `${config.supabase.url}${proxyReq.path}`,
      }, 'Проксируем Functions запрос');
    },
    proxyRes: (proxyRes: any, req: Request) => {
      logger.debug({
        status: proxyRes.statusCode,
        path: req.path,
      }, 'Functions ответ получен');
    },
    error: (err: any, req: Request) => {
      logger.error({ err, path: req.path }, 'Ошибка Functions прокси');
    },
  },
} as any);

router.use('/functions', authMiddleware, functionsProxy);

export default router;

