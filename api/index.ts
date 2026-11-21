/**
 * AIRWISE — Vercel Serverless Function Entry Point
 * Routes all /api/* requests directly through the hardened Express app.
 */

import app from '../server/src/index.js';

export default app;
