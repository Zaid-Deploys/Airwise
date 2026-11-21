/**
 * AIRWISE — Indoor Air Quality Route
 * POST /api/indoor
 */

import { Router } from 'express';
import { indoorRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import { generateIndoorRecommendations } from '../engine/recommendation-engine.js';
import type { ApiResponse, IndoorRecommendation } from '../types/index.js';
import { sendValidationError, sendErrorResponse } from './utils.js';

export const indoorRouter = Router();

indoorRouter.post('/', async (req, res) => {
  try {
    const parsed = indoorRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const { room, preferences } = parsed.data;
    const { location } = preferences;

    const aqData = await fetchAirQuality(location.latitude, location.longitude, location.city);
    const recommendations = generateIndoorRecommendations(aqData, preferences, room);

    const response: ApiResponse<IndoorRecommendation[]> = {
      success: true,
      data: recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Indoor Route Error]', error instanceof Error ? error.message : error);
    sendErrorResponse(res, 500, 'INDOOR_ERROR', 'Unable to generate indoor air recommendations.');
  }
});
