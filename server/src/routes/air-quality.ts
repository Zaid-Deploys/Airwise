/**
 * AIRWISE — Air Quality API Route
 * GET /api/air-quality?latitude=X&longitude=Y&city=Z
 */

import { Router } from 'express';
import { airQualityRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import type { ApiResponse, AirQualityData } from '../types/index.js';

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
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'PROVIDER_ERROR',
        message: 'Unable to fetch air quality data. Please try again later.',
      },
    };
    res.status(502).json(response);
  }
});
