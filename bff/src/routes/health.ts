import { Router, Request, Response } from 'express';
import { config } from '../config.js';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'doirp-bff',
    environment: config.server.env,
    version: '1.0.0',
  });
});

export default router;

