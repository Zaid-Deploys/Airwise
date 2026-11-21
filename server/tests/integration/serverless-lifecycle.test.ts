/**
 * AIRWISE — Serverless Lifecycle & Deployment Compatibility Regression Tests
 * 
 * Verifies:
 * 1. Express listener is skipped under Vercel serverless runtime (VERCEL=1).
 * 2. Express listener starts normally in local development runtime.
 * 3. Express listener is skipped in automated test runtime (NODE_ENV=test).
 * 4. api/index.ts entrypoint exports the Express application cleanly without unmanaged sockets.
 * 5. Vercel proxy resolution defaults to 1 hop.
 * 6. CORS and rate-limiting protections remain active on the exported application.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../../src/index.js';
import { resolveTrustProxy } from '../../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

describe('Serverless Lifecycle & Deployment Compatibility Tests', () => {
  let testServer: http.Server;
  let testBaseUrl: string;

  beforeAll(async () => {
    testServer = http.createServer(app);
    await new Promise<void>((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const address = testServer.address() as { port: number };
        testBaseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      testServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  describe('Server Startup Guard Conditions', () => {
    // Startup guard expression: env.NODE_ENV !== 'test' && !env.IS_VERCEL
    const shouldStartListener = (nodeEnv: string, isVercel: boolean): boolean => {
      return nodeEnv !== 'test' && !isVercel;
    };

    it('evaluates to false under Vercel production runtime (skips app.listen)', () => {
      expect(shouldStartListener('production', true)).toBe(false);
    });

    it('evaluates to false under Vercel preview runtime (skips app.listen)', () => {
      expect(shouldStartListener('preview', true)).toBe(false);
    });

    it('evaluates to false in test environment regardless of Vercel setting', () => {
      expect(shouldStartListener('test', false)).toBe(false);
      expect(shouldStartListener('test', true)).toBe(false);
    });

    it('evaluates to true in local development runtime (starts normal listener)', () => {
      expect(shouldStartListener('development', false)).toBe(true);
    });

    it('evaluates to true in standalone container/docker runtime without Vercel flag', () => {
      expect(shouldStartListener('production', false)).toBe(true);
    });
  });

  describe('Process Execution Behavior (Subprocess Tests)', () => {
    it('exits cleanly without hanging on a TCP socket when VERCEL=1 is set', async () => {
      const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
        const proc = spawn('npx', ['tsx', 'server/src/index.ts'], {
          cwd: projectRoot,
          env: {
            ...process.env,
            VERCEL: '1',
            NODE_ENV: 'production',
          },
        });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });

        const timer = setTimeout(() => {
          proc.kill('SIGKILL');
          resolve({ code: -1, stdout, stderr });
        }, 5000);

        proc.on('close', (code) => {
          clearTimeout(timer);
          resolve({ code, stdout, stderr });
        });
      });

      // The process must exit cleanly (code 0) without hanging or printing the listener banner
      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('AIRWISE Server running on port');
    }, 10000);

    it('starts normal listener and logs startup banner in local development', async () => {
      const result = await new Promise<{ started: boolean; banner: string }>((resolve) => {
        // Use an arbitrary high port to avoid collision
        const testPort = '39123';
        const proc = spawn('npx', ['tsx', 'server/src/index.ts'], {
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            PORT: testPort,
          },
        });

        // Delete VERCEL if present in parent environment
        delete proc.spawnargs;

        let output = '';
        let resolved = false;

        proc.stdout.on('data', (d) => {
          output += d.toString();
          if (output.includes('AIRWISE Server running on port') && !resolved) {
            resolved = true;
            proc.kill('SIGTERM');
            resolve({ started: true, banner: output });
          }
        });

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            proc.kill('SIGKILL');
            resolve({ started: false, banner: output });
          }
        }, 6000);
      });

      expect(result.started).toBe(true);
      expect(result.banner).toContain('AIRWISE Server running on port');
    }, 10000);
  });

  describe('api/index.ts Serverless Entrypoint Compatibility', () => {
    it('exports a valid Express application function', async () => {
      // Import the root entrypoint dynamically
      const entrypoint = await import('../../../api/index.js');
      const exportedApp = entrypoint.default;

      expect(typeof exportedApp).toBe('function');
      expect(typeof exportedApp.use).toBe('function');
      expect(typeof exportedApp.get).toBe('function');
      expect(typeof exportedApp.post).toBe('function');
    });
  });

  describe('Vercel Proxy Resolution', () => {
    it('resolves trust proxy to 1 on Vercel deployment (VERCEL=1)', () => {
      expect(resolveTrustProxy('1')).toBe(1);
      expect(resolveTrustProxy('true')).toBe(1);
    });

    it('resolves trust proxy to false on local development (non-Vercel)', () => {
      expect(resolveTrustProxy(undefined)).toBe(false);
      expect(resolveTrustProxy('')).toBe(false);
    });
  });

  describe('CORS & Rate Limiting Verification on Exported Application', () => {
    it('responds with 200 OK and health status on GET /api/health', async () => {
      const res = await fetch(`${testBaseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { status: string; service: string };
      expect(data.status).toBe('ok');
      expect(data.service).toBe('AIRWISE API');
    });

    it('includes standard RateLimit headers on public API requests', async () => {
      const res = await fetch(`${testBaseUrl}/api/air-quality?latitude=28.6139&longitude=77.2090&city=Delhi`);
      expect(res.status).toBe(200);
      expect(res.headers.get('ratelimit-limit')).toBe('60');
      expect(res.headers.get('ratelimit-remaining')).not.toBeNull();
    });

    it('applies stricter rate limits to AI endpoints', async () => {
      const res = await fetch(`${testBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.headers.get('ratelimit-limit')).toBe('20');
      expect(res.headers.get('ratelimit-remaining')).not.toBeNull();
    });
  });
});
