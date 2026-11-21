/**
 * AIRWISE — Sustainable Alternatives Route
 * POST /api/sustainable
 */

import { Router } from 'express';
import { sustainableRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import { generateSustainableAlternatives } from '../engine/recommendation-engine.js';
import type { ApiResponse, SustainableAlternative } from '../types/index.js';
import { sendValidationError, sendErrorResponse } from './utils.js';

export const sustainableRouter = Router();

sustainableRouter.post('/', async (req, res) => {
  try {
    const parsed = sustainableRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const { preferences } = parsed.data;
    const { location } = preferences;

    const aqData = await fetchAirQuality(location.latitude, location.longitude, location.city);
    const alternatives = generateSustainableAlternatives(aqData, preferences);

    const response: ApiResponse<SustainableAlternative[]> = {
      success: true,
      data: alternatives,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Sustainable Route Error]', error instanceof Error ? error.message : error);
    sendErrorResponse(res, 500, 'SUSTAINABLE_ERROR', 'Unable to generate sustainable alternatives.');
  }
});
