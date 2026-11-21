/**
 * AIRWISE — Test Setup & Isolation Safeguard
 * 
 * Configures the test environment before any application module is evaluated.
 * Enforces that no real API credentials can leak into unit or integration tests.
 */

process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
