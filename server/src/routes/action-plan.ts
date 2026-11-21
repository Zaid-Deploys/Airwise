/**
 * AIRWISE — Daily Action Plan API Route
 * POST /api/action-plan
 */

import { Router } from 'express';
import { actionPlanRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import { generateDailyPlan } from '../engine/recommendation-engine.js';
import { generateAiPlan } from '../ai/client.js';
import type { ApiResponse, DailyActionPlan } from '../types/index.js';

export const actionPlanRouter = Router();

actionPlanRouter.post('/', async (req, res) => {
  try {
    const parsed = actionPlanRequestSchema.safeParse(req.body);

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

    // Fetch air quality data
    const aqData = await fetchAirQuality(location.latitude, location.longitude, location.city);

    // Generate deterministic base plan
    const basePlan = generateDailyPlan(aqData, preferences);

    // AI enhancement layer (with automatic fallback to basePlan)
    let finalPlan: DailyActionPlan;
    try {
      finalPlan = await generateAiPlan(basePlan, aqData, preferences);
    } catch (aiError) {
      console.warn('[Action Plan Route] AI enhancement failed, returning deterministic plan:', aiError);
      finalPlan = basePlan;
    }

    const response: ApiResponse<DailyActionPlan> = {
      success: true,
      data: finalPlan,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
        provider: 'Open-Meteo',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Action Plan Error]', error instanceof Error ? error.message : error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'PLAN_ERROR',
        message: 'Unable to generate action plan. Please try again.',
      },
    };
    res.status(500).json(response);
  }
});
