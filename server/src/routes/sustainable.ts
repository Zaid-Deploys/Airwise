/**
 * AIRWISE — Sustainable Alternatives Route
 * POST /api/sustainable
 */

import { Router } from 'express';
import { sustainableRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import { generateSustainableAlternatives } from '../engine/recommendation-engine.js';
import type { ApiResponse, SustainableAlternative } from '../types/index.js';

export const sustainableRouter = Router();

sustainableRouter.post('/', async (req, res) => {
  try {
    const parsed = sustainableRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      };
      res.status(400).json(response);
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
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'SUSTAINABLE_ERROR',
        message: 'Unable to generate sustainable alternatives.',
      },
    };
    res.status(500).json(response);
  }
});
