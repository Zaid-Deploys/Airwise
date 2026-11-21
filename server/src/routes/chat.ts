/**
 * AIRWISE — AI Assistant Chat Route
 * POST /api/chat
 */

import { Router } from 'express';
import { chatRequestSchema } from '../schemas/index.js';
import { fetchAirQuality } from '../providers/open-meteo.js';
import { handleChatMessage } from '../ai/client.js';
import type { ApiResponse, ChatMessage } from '../types/index.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const parsed = chatRequestSchema.safeParse(req.body);

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

    const { message, preferences, conversationHistory } = parsed.data;
    const { location } = preferences;

    // Fetch current air quality context
    let aqData = null;
    try {
      aqData = await fetchAirQuality(location.latitude, location.longitude, location.city);
    } catch (err) {
      console.warn('[Chat Route] Could not fetch live AQ context, proceeding with default context:', err);
    }

    const reply = await handleChatMessage(message, aqData, preferences, conversationHistory);

    const response: ApiResponse<ChatMessage> = {
      success: true,
      data: reply,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Chat Error]', error instanceof Error ? error.message : error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'CHAT_ERROR',
        message: 'Unable to process your question. Please try again.',
      },
    };
    res.status(500).json(response);
  }
});
