/**
 * AIRWISE — Air Quality API Route
 * GET /api/air-quality?latitude=X&longitude=Y&city=Z
 */

import { Router } from 'express';
import { airQualityRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import type { ApiResponse, AirQualityData } from '../types/index.js';
import { sendValidationError, sendErrorResponse } from './utils.js';

export const airQualityRouter = Router();

airQualityRouter.get('/', async (req, res) => {
  try {
    const lat = typeof req.query.latitude === 'string' ? parseFloat(req.query.latitude) : NaN;
    const lon = typeof req.query.longitude === 'string' ? parseFloat(req.query.longitude) : NaN;
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';

    const parsed = airQualityRequestSchema.safeParse({
      latitude: lat,
      longitude: lon,
      city,
    });

    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    const { latitude, longitude, city: cityName } = parsed.data;
    const data = await fetchAirQuality(latitude, longitude, cityName);

    const response: ApiResponse<AirQualityData> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
        provider: 'Open-Meteo',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Air Quality Route Error]', error instanceof Error ? error.message : error);
    sendErrorResponse(res, 502, 'PROVIDER_ERROR', 'Unable to fetch air quality data. Please try again later.');
  }
});
