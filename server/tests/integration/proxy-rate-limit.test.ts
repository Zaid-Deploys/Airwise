/**
 * AIRWISE — Proxy Configuration & Rate Limiting Regression Tests
 * 
 * Verifies deployment-aware 'trust proxy' resolution, protection against IP spoofing,
 * correct req.ip resolution under one-hop proxying, and rate limit header integrity.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import app from '../../src/index.js';
import { resolveTrustProxy } from '../../src/config/env.js';

describe('Deployment-Aware Proxy Configuration & Rate Limiting Tests', () => {
  let mainServer: http.Server;
  let mainBaseUrl: string;

  beforeAll(async () => {
    mainServer = http.createServer(app);
    await new Promise<void>((resolve) => {
      mainServer.listen(0, '127.0.0.1', () => {
        const address = mainServer.address() as { port: number };
        mainBaseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      mainServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('resolveTrustProxy Logic', () => {
    it('defaults to false in local development / non-Vercel environment', () => {
      expect(resolveTrustProxy(undefined, undefined)).toBe(false);
      expect(resolveTrustProxy('', '')).toBe(false);
    });

    it('defaults to exactly 1 hop on Vercel deployment (VERCEL=1 or VERCEL=true)', () => {
      expect(resolveTrustProxy('1', undefined)).toBe(1);
      expect(resolveTrustProxy('true', undefined)).toBe(1);
    });

    it('allows explicit validated positive numeric hop count (1 to 10)', () => {
      expect(resolveTrustProxy(undefined, '1')).toBe(1);
      expect(resolveTrustProxy(undefined, '2')).toBe(2);
      expect(resolveTrustProxy('1', '3')).toBe(3);
    });

    it('allows explicit disabling via "false" or "0" even if on Vercel', () => {
      expect(resolveTrustProxy('1', 'false')).toBe(false);
      expect(resolveTrustProxy('1', '0')).toBe(false);
      expect(resolveTrustProxy(undefined, 'false')).toBe(false);
    });

    it('strictly forbids blanket "true" and fails safely', () => {
      // Blanket true is unsafe because it trusts arbitrary headers from anyone
      expect(resolveTrustProxy(undefined, 'true')).toBe(false);
      expect(resolveTrustProxy('1', 'true')).toBe(1); // Fails safely to Vercel default 1
    });

    it('fails safely on invalid or out-of-range proxy overrides', () => {
      expect(resolveTrustProxy(undefined, 'invalid-string')).toBe(false);
      expect(resolveTrustProxy(undefined, '-1')).toBe(false);
      expect(resolveTrustProxy(undefined, '999')).toBe(false);
      expect(resolveTrustProxy('1', 'invalid-string')).toBe(1);
    });
  });

  describe('Application-Level Trust Proxy Configuration', () => {
    it('configures trust proxy to false in test/development runtime', () => {
      expect(app.get('trust proxy')).toBe(false);
    });

    it('never enables blanket trust proxy = true on the application instance', () => {
      expect(app.get('trust proxy')).not.toBe(true);
    });
  });

  describe('Simulated IP Resolution Behavior (Without Exposing IP Diagnostics)', () => {
    let simServer: http.Server;
    let simPort: number;
    let capturedIp = '';

    afterAll(async () => {
      if (simServer) {
        await new Promise<void>((resolve, reject) => {
          simServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    });

    it('resolves req.ip from forwarded header when trust proxy = 1 (Vercel simulation)', async () => {
      const vApp = express();
      vApp.set('trust proxy', resolveTrustProxy('1'));
      vApp.get('/test-proxy', (req, res) => {
        capturedIp = req.ip || '';
        res.sendStatus(200); // Does NOT leak IP in response body
      });

      simServer = http.createServer(vApp);
      await new Promise<void>((resolve) => {
        simServer.listen(0, '127.0.0.1', () => {
          const address = simServer.address() as { port: number };
          simPort = address.port;
          resolve();
        });
      });

      const res = await fetch(`http://127.0.0.1:${simPort}/test-proxy`, {
        headers: {
          'X-Forwarded-For': '203.0.113.195',
        },
      });

      expect(res.status).toBe(200);
      expect(capturedIp).toBe('203.0.113.195');

      await new Promise<void>((resolve, reject) => {
        simServer.close((err) => (err ? reject(err) : resolve()));
      });
    });

    it('ignores X-Forwarded-For and resolves to socket IP when trust proxy = false (Local dev)', async () => {
      const localApp = express();
      localApp.set('trust proxy', resolveTrustProxy(undefined));
      localApp.get('/test-local', (req, res) => {
        capturedIp = req.ip || '';
        res.sendStatus(200); // Does NOT leak IP in response body
      });

      simServer = http.createServer(localApp);
      await new Promise<void>((resolve) => {
        simServer.listen(0, '127.0.0.1', () => {
          const address = simServer.address() as { port: number };
          simPort = address.port;
          resolve();
        });
      });

      const res = await fetch(`http://127.0.0.1:${simPort}/test-local`, {
        headers: {
          'X-Forwarded-For': '203.0.113.195',
        },
      });

      expect(res.status).toBe(200);
      // Under trust proxy = false, Express ignores X-Forwarded-For and uses the loopback socket address
      expect(capturedIp).toBe('127.0.0.1');
    });
  });

  describe('Rate Limiting & Header Spoofing Resistance on Main Application', () => {
    it('sets standard RateLimit headers on GET /api/air-quality with 60 limit', async () => {
      const res = await fetch(`${mainBaseUrl}/api/air-quality?latitude=28.6139&longitude=77.2090&city=Delhi`);
      expect(res.status).toBe(200);
      expect(res.headers.get('ratelimit-limit')).toBe('60');
      expect(res.headers.get('ratelimit-remaining')).not.toBeNull();
      expect(res.headers.get('x-ratelimit-limit')).toBeNull(); // Legacy headers disabled
    });

    it('prevents rate limit key manipulation through untrusted X-Forwarded-For headers', async () => {
      // In local/non-Vercel environment (trust proxy = false), Express keys by socket address (127.0.0.1).
      // Spoofing X-Forwarded-For must NOT create separate buckets or bypass decrementing.
      const res1 = await fetch(`${mainBaseUrl}/api/air-quality?latitude=28.6139&longitude=77.2090&city=Delhi`, {
        headers: { 'X-Forwarded-For': '198.51.100.1' },
      });
      const remaining1 = parseInt(res1.headers.get('ratelimit-remaining') || '0', 10);

      const res2 = await fetch(`${mainBaseUrl}/api/air-quality?latitude=28.6139&longitude=77.2090&city=Delhi`, {
        headers: { 'X-Forwarded-For': '198.51.100.2' }, // Different spoofed IP
      });
      const remaining2 = parseInt(res2.headers.get('ratelimit-remaining') || '0', 10);

      // Remaining count must decrement because both requests belong to the same socket IP 127.0.0.1
      expect(remaining2).toBe(remaining1 - 1);
    });

    it('sets standard RateLimit headers on AI endpoint with 20 limit', async () => {
      const res = await fetch(`${mainBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Validation will fail with 400, but aiLimiter ran first
      });

      expect(res.headers.get('ratelimit-limit')).toBe('20');
      expect(res.headers.get('ratelimit-remaining')).not.toBeNull();
    });

    it('returns structured 429 Too Many Requests response when rate limit is exceeded', async () => {
      // Verify rate-limiting rejection behavior with an isolated limiter instance matching production configuration
      const testApp = express();
      const testLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 1,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.' } },
      });

      testApp.use('/test-limit', testLimiter, (_req, res) => {
        res.json({ success: true });
      });

      const server = http.createServer(testApp);
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address() as { port: number };

      try {
        const res1 = await fetch(`http://127.0.0.1:${address.port}/test-limit`);
        expect(res1.status).toBe(200);

        const res2 = await fetch(`http://127.0.0.1:${address.port}/test-limit`);
        expect(res2.status).toBe(429);
        const data = (await res2.json()) as { success: boolean; error: { code: string; message: string } };
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('RATE_LIMIT');
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      }
    });
  });
});
