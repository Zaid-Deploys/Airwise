/**
 * AIRWISE — CORS Security & Origin Policy Integration Tests
 * 
 * Verifies strict origin matching, production vs. development policies,
 * preflight OPTIONS behavior, and fail-closed handling for unauthorized origins.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app, { isAllowedOrigin } from '../../src/index.js';
import { normalizeOrigin } from '../../src/config/env.js';

describe('AIRWISE CORS Security & Origin Policy Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('Origin Normalization and Validation (normalizeOrigin)', () => {
    it('normalizes valid origins by stripping trailing slashes, paths, and query strings', () => {
      expect(normalizeOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
      expect(normalizeOrigin('https://airwise.example.com/some/path?param=1')).toBe('https://airwise.example.com');
      expect(normalizeOrigin('https://production-deployment.vercel.app/')).toBe('https://production-deployment.vercel.app');
    });

    it('returns null for invalid or non-HTTP/HTTPS origins', () => {
      expect(normalizeOrigin('not-a-url')).toBeNull();
      expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
      expect(normalizeOrigin('')).toBeNull();
      expect(normalizeOrigin(undefined)).toBeNull();
      expect(normalizeOrigin(null)).toBeNull();
    });
  });

  describe('Origin Allowance Logic (isAllowedOrigin)', () => {
    const prodClientOrigin = 'https://airwise-official.vercel.app';

    it('accepts requests with no Origin header (server-to-server, curl, health probes)', () => {
      expect(isAllowedOrigin(undefined, prodClientOrigin, 'production')).toBe(true);
      expect(isAllowedOrigin('', prodClientOrigin, 'production')).toBe(true);
    });

    it('accepts exact configured production client origin in production', () => {
      expect(isAllowedOrigin('https://airwise-official.vercel.app', prodClientOrigin, 'production')).toBe(true);
    });

    it('rejects arbitrary external origins in production', () => {
      expect(isAllowedOrigin('https://malicious-website.com', prodClientOrigin, 'production')).toBe(false);
      expect(isAllowedOrigin('https://attacker.org', prodClientOrigin, 'production')).toBe(false);
    });

    it('rejects unrelated Vercel subdomains (no wildcard suffix matching) in production', () => {
      expect(isAllowedOrigin('https://unrelated-attacker.vercel.app', prodClientOrigin, 'production')).toBe(false);
      expect(isAllowedOrigin('https://airwise-official-phishing.vercel.app', prodClientOrigin, 'production')).toBe(false);
      expect(isAllowedOrigin('https://evil.vercel.app', prodClientOrigin, 'production')).toBe(false);
    });

    it('accepts local development origins only in non-production environments', () => {
      // Allowed in development / test
      expect(isAllowedOrigin('http://localhost:5173', prodClientOrigin, 'development')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173', prodClientOrigin, 'development')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000', prodClientOrigin, 'development')).toBe(true);

      // Strictly rejected in production
      expect(isAllowedOrigin('http://localhost:5173', prodClientOrigin, 'production')).toBe(false);
      expect(isAllowedOrigin('http://127.0.0.1:5173', prodClientOrigin, 'production')).toBe(false);
    });

    it('rejects arbitrary external origins even in development', () => {
      expect(isAllowedOrigin('https://evil-hacker.com', prodClientOrigin, 'development')).toBe(false);
      expect(isAllowedOrigin('https://unrelated.vercel.app', prodClientOrigin, 'development')).toBe(false);
    });
  });

  describe('Live HTTP CORS Policy Verification', () => {
    it('allows requests without an Origin header and returns healthy response without Access-Control-Allow-Origin', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { status: string };
      expect(json.status).toBe('ok');
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('returns Access-Control-Allow-Origin for permitted development origin', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    });

    it('does NOT return Access-Control-Allow-Origin for arbitrary external origin', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'https://malicious-attacker.com',
        },
      });
      // Response succeeds without server error (500), but CORS header is withheld
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('does NOT return Access-Control-Allow-Origin for unrelated Vercel subdomains', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'https://attacker-project.vercel.app',
        },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('succeeds on OPTIONS preflight from a permitted origin with proper headers', async () => {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
      expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
      expect(res.headers.get('access-control-max-age')).toBe('86400');
    });

    it('withholds Access-Control-Allow-Origin on OPTIONS preflight from a rejected origin', async () => {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      // Preflight without Access-Control-Allow-Origin causes browser to block the cross-origin request
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('preserves existing same-origin application API behaviour and security middleware', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      const body = (await res.json()) as { service: string };
      expect(body.service).toBe('AIRWISE API');
    });
  });
});
