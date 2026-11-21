/**
 * AIRWISE — Frontend API Client
 * Connects to the Express backend with typed requests and timeout/error handling.
 */

import type {
  AirQualityData,
  UserPreferences,
  DailyActionPlan,
  IndoorRecommendation,
  SustainableAlternative,
  ChatMessage,
  ApiResponse,
  RoomType,
} from '../types/index.js';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    let json: ApiResponse<T>;

    if (!res.ok) {
      if (contentType.includes('application/json')) {
        json = (await res.json().catch(() => null)) as ApiResponse<T>;
        throw new Error(json?.error?.message || `Server error (${res.status})`);
      }
      throw new Error(`Server error (${res.status}). Service temporarily unavailable.`);
    }

    try {
      json = await res.json();
    } catch {
      throw new Error('Invalid response received from server.');
    }

    if (!json.success) {
      throw new Error(json.error?.message || `Request failed with status ${res.status}`);
    }

    if (json.data === undefined) {
      throw new Error('API response contained no data');
    }

    return json.data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Server request timed out. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  /**
   * Fetch real-time air quality & hourly forecast
   */
  async getAirQuality(latitude: number, longitude: number, city: string): Promise<AirQualityData> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      city,
    });
    return request<AirQualityData>(`/air-quality?${params.toString()}`);
  },

  /**
   * Generate personalized Daily Action Plan
   */
  async getActionPlan(preferences: UserPreferences): Promise<DailyActionPlan> {
    return request<DailyActionPlan>('/action-plan', {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    });
  },

  /**
   * Send message to AIRWISE AI Assistant
   */
  async sendChatMessage(
    message: string,
    preferences: UserPreferences,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<ChatMessage> {
    return request<ChatMessage>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, preferences, conversationHistory }),
    });
  },

  /**
   * Get room-by-room indoor air quality guide
   */
  async getIndoorRecommendations(
    preferences: UserPreferences,
    room?: RoomType
  ): Promise<IndoorRecommendation[]> {
    return request<IndoorRecommendation[]>('/indoor', {
      method: 'POST',
      body: JSON.stringify({ preferences, room }),
    });
  },

  /**
   * Get personalized sustainable alternatives
   */
  async getSustainableAlternatives(preferences: UserPreferences): Promise<SustainableAlternative[]> {
    return request<SustainableAlternative[]>('/sustainable', {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    });
  },

  /**
   * Check backend server health
   */
  async checkHealth(): Promise<{ status: string; hasGeminiKey: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
