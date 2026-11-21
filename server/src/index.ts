/**
 * AIRWISE Server — Main Entry Point
 * Express API server with security middleware, rate limiting,
 * and structured error handling.
 */

import { env } from './config/env.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { airQualityRouter } from './routes/air-quality.js';
import { actionPlanRouter } from './routes/action-plan.js';
import { chatRouter } from './routes/chat.js';
import { indoorRouter } from './routes/indoor.js';
import { sustainableRouter } from './routes/sustainable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = env.PORT;
const CLIENT_ORIGIN = env.CLIENT_ORIGIN;

// ============================================
// Proxy & Rate Limiting Configuration
// ============================================

// Deployment-aware proxy configuration for accurate client-IP resolution and rate limiting
// - Local development / non-Vercel: false (ignores spoofed X-Forwarded-For headers)
// - Vercel production: 1 (trusts exactly 1 reverse proxy hop from Vercel edge)
// - Never allows blanket `trust proxy = true`
app.set('trust proxy', env.TRUST_PROXY);

// ============================================
// Security Middleware & CORS
// ============================================

/**
 * Evaluates whether an incoming HTTP Origin is permitted under the strict CORS policy.
 * 
 * Rules:
 * 1. Requests with no Origin header (curl, server-to-server, health check probes) are permitted.
 * 2. Exact match with the validated, normalized CLIENT_ORIGIN is permitted.
 * 3. In non-production environments (development / test), local development origins on localhost / 127.0.0.1 are permitted.
 * 4. In production, only the exact configured CLIENT_ORIGIN is permitted. No wildcard or guessed regexes are used.
 */
export function isAllowedOrigin(origin: string | undefined, clientOrigin: string, nodeEnv: string): boolean {
  if (!origin) {
    return true;
  }

  // Exact match with configured, normalized client origin
  if (clientOrigin && origin === clientOrigin) {
    return true;
  }

  // In non-production environments, allow local development origins
  if (nodeEnv !== 'production') {
    try {
      const url = new URL(origin);
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS - Strict Environment-Aware Origin Policy
app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow non-browser requests with no origin (curl, server-to-server, health checks)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Check strict origin permission
    if (isAllowedOrigin(origin, CLIENT_ORIGIN, env.NODE_ENV)) {
      return callback(null, true);
    }

    // 3. Rejected origins receive callback(null, false)
    // This withholds Access-Control-Allow-Origin cleanly without producing an HTTP 500 error
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// Body parsing with size limits to prevent payload abuse
app.use(express.json({ limit: '20kb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.' } },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 AI requests per minute (protects Gemini quota)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'AI_RATE_LIMIT', message: 'AI request limit reached. Please wait a moment.' } },
});

// ============================================
// Routes
// ============================================

app.use('/api/air-quality', apiLimiter, airQualityRouter);
app.use('/api/action-plan', aiLimiter, actionPlanRouter);
app.use('/api/chat', aiLimiter, chatRouter);
app.use('/api/indoor', aiLimiter, indoorRouter);
app.use('/api/sustainable', aiLimiter, sustainableRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AIRWISE API',
    version: '1.0.0',
    hasGeminiKey: env.hasGeminiKey,
    environment: env.NODE_ENV,
  });
});

// Serve client static bundle if built (production / preview mode)
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API requests
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred. Please try again.' },
  });
});

// Start server if not imported as module
if (env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🌬️  AIRWISE Server running on port ${PORT}`);
    console.log(`   Client origin: ${CLIENT_ORIGIN}`);
    console.log(`   Trust proxy: ${app.get('trust proxy')}`);
    console.log(`   Gemini API: ${env.hasGeminiKey ? 'Configured ✓' : 'Not configured (fallback mode)'}`);
    console.log(`   Environment: ${env.NODE_ENV}\n`);
  });
}

export default app;
