/**
 * AIRWISE — Environment Variable Loader
 * 
 * Safely loads environment variables in priority order across workspaces
 * without overriding existing process.env variables (e.g. from container or Vercel).
 * 
 * Priority:
 * 1. .env.local (root or server workspace)
 * 2. .env (root or server workspace)
 * 3. System / Container environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppEnvConfig {
  PORT: number;
  CLIENT_ORIGIN: string;
  NODE_ENV: string;
  GEMINI_API_KEY: string | undefined;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
  hasGeminiKey: boolean;
  IS_VERCEL: boolean;
  TRUST_PROXY: number | boolean;
}

/**
 * Resolves the Express 'trust proxy' setting in a deployment-aware manner.
 * 
 * Rules:
 * 1. Never enables blanket `trust proxy = true` (rejects boolean true / "true").
 * 2. On Vercel deployments (VERCEL=1 or VERCEL=true), defaults to exactly 1 trusted proxy hop.
 * 3. On local development and non-Vercel environments, defaults to `false` (no proxy hops trusted).
 * 4. Allows an explicitly configured, validated positive integer (1-10) for proxy hops if configured.
 * 5. Fails safely to the deployment default (1 on Vercel, false elsewhere) on invalid configurations.
 */
export function resolveTrustProxy(
  vercelEnv: string | undefined = process.env.VERCEL,
  trustProxyOverride: string | undefined = process.env.TRUST_PROXY ?? process.env.TRUSTED_PROXY_HOPS
): number | boolean {
  const isVercel = vercelEnv === '1' || vercelEnv === 'true';

  if (trustProxyOverride !== undefined && trustProxyOverride.trim() !== '') {
    const trimmed = trustProxyOverride.trim().toLowerCase();

    // Explicit disable
    if (trimmed === 'false' || trimmed === '0') {
      return false;
    }

    // Blanket "true" is strictly forbidden for security reasons
    if (trimmed === 'true') {
      console.warn('[Security Warning] Blanket "trust proxy = true" is unsafe and not permitted. Falling back safely.');
      return isVercel ? 1 : false;
    }

    // Numeric proxy hops (must be a positive integer between 1 and 10)
    const hops = Number(trimmed);
    if (Number.isInteger(hops) && hops >= 1 && hops <= 10) {
      return hops;
    }

    // Invalid proxy configuration - fail safely
    console.warn(`[Security Warning] Invalid proxy configuration "${trustProxyOverride}". Falling back safely.`);
    return isVercel ? 1 : false;
  }

  // Default deployment-aware resolution:
  // Vercel overwrites X-Forwarded-For with the public client IP (1 hop).
  // Local development / non-Vercel environments do not trust proxy headers (false).
  return isVercel ? 1 : false;
}

/**
 * Normalizes and validates a URL string as a standard HTTP/HTTPS origin.
 * Strips trailing slashes, paths, query parameters, and hashes.
 * Returns null if the input is not a valid http: or https: URL.
 */
export function normalizeOrigin(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function loadEnvironment(): AppEnvConfig {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  // Potential locations for .env files (evaluated from lowest to highest priority so later overrides earlier, or loaded sequentially)
  // In test environment, skip loading .env and .env.local to maintain strict test isolation
  const candidateFiles = isTest
    ? []
    : [
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../../.env.local'),
        path.resolve(__dirname, '../../.env.local'),
        path.resolve(process.cwd(), '.env.local'),
      ];

  // Track which files were loaded (paths only, no secrets)
  const loadedFiles: string[] = [];

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: true });
      if (!loadedFiles.includes(filePath)) {
        loadedFiles.push(filePath);
      }
    }
  }

  const port = parseInt(process.env.PORT || '3001', 10);
  const nodeEnv = process.env.NODE_ENV || (isTest ? 'test' : 'development');

  // Validate and normalize CLIENT_ORIGIN as a strict origin (protocol + host + port)
  const rawClientOrigin = process.env.CLIENT_ORIGIN;
  const normalizedOrigin = normalizeOrigin(rawClientOrigin);
  let clientOrigin: string;

  if (rawClientOrigin !== undefined && rawClientOrigin.trim() !== '') {
    if (normalizedOrigin) {
      clientOrigin = normalizedOrigin;
    } else {
      if (nodeEnv === 'production') {
        console.warn(`[Security Warning] Invalid CLIENT_ORIGIN "${rawClientOrigin}" in production. Failing closed to empty string.`);
        clientOrigin = ''; // Fail closed in production for invalid origin config
      } else {
        clientOrigin = 'http://localhost:5173';
      }
    }
  } else {
    clientOrigin = nodeEnv === 'production' ? '' : 'http://localhost:5173';
  }

  // Real credentials must never be consumed or exposed in test environment
  const geminiApiKey = isTest ? undefined : (process.env.GEMINI_API_KEY?.trim() || undefined);
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const geminiTimeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || '15000', 10);
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const trustProxy = resolveTrustProxy(process.env.VERCEL, process.env.TRUST_PROXY ?? process.env.TRUSTED_PROXY_HOPS);

  return {
    PORT: isNaN(port) ? 3001 : port,
    CLIENT_ORIGIN: clientOrigin,
    NODE_ENV: nodeEnv,
    GEMINI_API_KEY: geminiApiKey,
    GEMINI_MODEL: geminiModel,
    GEMINI_TIMEOUT_MS: isNaN(geminiTimeoutMs) ? 15000 : geminiTimeoutMs,
    hasGeminiKey: !!geminiApiKey && geminiApiKey !== '',
    IS_VERCEL: isVercel,
    TRUST_PROXY: trustProxy,
  };
}

export const env = loadEnvironment();
