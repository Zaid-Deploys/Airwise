/**
 * AIRWISE — Route Utilities
 *
 * Shared helpers for Express route handlers to eliminate duplication
 * in validation error formatting and error response construction.
 */

import type { Response } from 'express';
import type { ZodError } from 'zod';
import type { ApiResponse } from '../types/index.js';

/**
 * Format Zod validation errors into a human-readable semicolon-delimited string.
 */
export function formatValidationErrors(error: ZodError): string {
  return error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

/**
 * Send a standardized JSON error response.
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  const response: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a standardized validation error (400) response from a Zod parse failure.
 */
export function sendValidationError(res: Response, error: ZodError): void {
  sendErrorResponse(res, 400, 'VALIDATION_ERROR', formatValidationErrors(error));
}
