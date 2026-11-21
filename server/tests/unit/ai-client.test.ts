/**
 * AIRWISE — Gemini AI Client Unit Tests
 * 
 * Verifies AI client behavior using controlled mocks and fixtures.
 * ZERO real API calls are made and ZERO real credentials are consumed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import {
  generateAiPlan,
  handleChatMessage,
  isGeminiAvailable,
  setAiClientForTesting,
  resetAiClientForTesting,
  withTimeout,
} from '../../src/ai/client.js';
import type {
  AirQualityData,
  UserPreferences,
  DailyActionPlan,
} from '../../src/types/index.js';

const mockPreferences: UserPreferences = {
  location: { city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 },
  schedule: { wakeUpTime: '06:00', sleepTime: '22:00' },
  lifestyle: {
    commuteMode: 'motorcycle',
    commuteDurationMinutes: 40,
    exerciseType: 'running',
    exerciseLocation: 'outdoor',
    outdoorActivities: [],
  },
  home: {
    ventilationType: 'windows_closed',
    hasAirPurifier: true,
    hasIndoorPlants: false,
    cookingFuel: 'gas',
    hasExhaust: true,
  },
  sensitivity: {
    hasChildren: true,
    hasElderly: false,
    hasSensitiveMembers: false,
  },
};

const mockAqData: AirQualityData = {
  aqi: 380,
  category: 'Very Poor',
  standard: 'CPCB_India',
  prominentPollutant: 'pm25',
  pollutants: [
    { name: 'pm25', value: 220, unit: 'μg/m³', subIndex: 380 },
    { name: 'pm10', value: 340, unit: 'μg/m³', subIndex: 300 },
    { name: 'no2', value: 65, unit: 'μg/m³', subIndex: 81 },
    { name: 'so2', value: 24, unit: 'μg/m³', subIndex: 30 },
    { name: 'co', value: 1.8, unit: 'mg/m³', subIndex: 90 },
    { name: 'o3', value: 45, unit: 'μg/m³', subIndex: 45 },
  ],
  location: { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi', country: 'India' },
  metadata: {
    provider: 'Open-Meteo',
    dataType: 'model_estimate',
    observationTime: '2026-11-18T10:00:00Z',
    retrievalTime: '2026-11-18T10:05:00Z',
    freshnessStatus: 'fresh',
    modelSource: 'Copernicus CAMS (ECMWF)',
    attribution: 'Air quality data by Open-Meteo.com',
  },
  hourlyForecast: [],
};

const mockBasePlan: DailyActionPlan = {
  date: '2026-11-18',
  location: 'New Delhi',
  currentAqi: 380,
  aqiCategory: 'Very Poor',
  generatedAt: '2026-11-18T10:00:00Z',
  isAiGenerated: false,
  isFallback: false,
  morning: [
    {
      id: 'm-1',
      action: 'Avoid morning outdoor run',
      reason: 'Winter ground inversion traps PM2.5',
      context: 'You scheduled outdoor running at 06:00',
      expectedBenefit: 'Reduces peak exposure',
      limitation: 'Requires indoor workout',
      source: 'CPCB Guidelines',
      priority: 'critical',
      category: 'exercise',
      timeOfDay: 'morning',
      impactType: 'exposure_reduction',
      isCompleted: false,
    },
  ],
  afternoon: [],
  evening: [],
  night: [],
  summary: 'Very Poor air quality advisory',
  keyMessage: 'Protect lungs during morning inversion',
};

describe('Gemini AI Client Unit Tests', () => {
  beforeEach(() => {
    resetAiClientForTesting();
  });

  afterEach(() => {
    resetAiClientForTesting();
    vi.restoreAllMocks();
  });

  describe('When GEMINI_API_KEY is not configured', () => {
    it('enforces unit-test isolation safeguard: real credentials cannot leak into test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(env.GEMINI_API_KEY).toBeUndefined();
      expect(env.hasGeminiKey).toBe(false);
      expect(isGeminiAvailable()).toBe(false);
    });

    it('reports isGeminiAvailable as false', () => {
      expect(isGeminiAvailable()).toBe(false);
    });

    it('returns deterministic base plan with fallback flags', async () => {
      const plan = await generateAiPlan(mockBasePlan, mockAqData, mockPreferences);
      expect(plan.isAiGenerated).toBe(false);
      expect(plan.isFallback).toBe(true);
      expect(plan.morning.length).toBe(1);
      expect(plan.morning[0]!.action).toBe('Avoid morning outdoor run');
    });

    it('generates an evidence-grounded deterministic chat fallback for exercise queries', async () => {
      const reply = await handleChatMessage(
        'Should I go for a run outside today?',
        mockAqData,
        mockPreferences
      );

      expect(reply.role).toBe('assistant');
      expect(reply.isAiGenerated).toBe(false);
      expect(reply.content).toContain('Avoid all strenuous outdoor exercise today');
      expect(reply.sources).toContain('CPCB National Air Quality Index Guidelines');
    });

    it('generates an evidence-grounded deterministic chat fallback for ventilation queries', async () => {
      const reply = await handleChatMessage(
        'Can I open windows to ventilate the room?',
        mockAqData,
        mockPreferences
      );

      expect(reply.isAiGenerated).toBe(false);
      expect(reply.content).toContain('Keep windows and balcony doors sealed');
    });
  });

  describe('When Gemini mock client is injected', () => {
    it('successfully processes valid JSON schema response from Gemini', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          summary: 'High particulate load in New Delhi today.',
          keyMessage: 'Wear N95 on motorcycle and run indoors.',
          morning: [
            {
              action: 'Wear certified N95 respirator during 40-minute commute',
              reason: 'Two-wheeler travel exposes you directly to road dust and exhaust',
              context: 'Motorcycle commute in Very Poor air',
              expectedBenefit: 'Filters >95% of fine toxic particles',
              limitation: 'Slightly increased breathing resistance',
              source: 'WHO Air Quality Guidelines (2021)',
              priority: 'critical',
              category: 'commute',
              impactType: 'exposure_reduction',
            },
          ],
          afternoon: [],
          evening: [],
          night: [],
        }),
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as any;

      setAiClientForTesting(mockClient);
      expect(isGeminiAvailable()).toBe(true);

      const plan = await generateAiPlan(mockBasePlan, mockAqData, mockPreferences);
      expect(plan.isAiGenerated).toBe(true);
      expect(plan.isFallback).toBe(false);
      expect(plan.morning.length).toBe(1);
      expect(plan.morning[0]!.action).toContain('Wear certified N95');
      expect(plan.summary).toContain('High particulate load');
    });

    it('safely falls back to base plan if Gemini returns empty text', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: '',
      });

      const mockClient = {
        models: { generateContent: mockGenerateContent },
      } as any;

      setAiClientForTesting(mockClient);

      const plan = await generateAiPlan(mockBasePlan, mockAqData, mockPreferences);
      expect(plan.isAiGenerated).toBe(false);
      expect(plan.isFallback).toBe(true);
      expect(plan.morning[0]!.action).toBe('Avoid morning outdoor run');
    });

    it('safely falls back to base plan if Gemini throws an error or rate limit', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('ResourceExhausted: 429 Rate limit exceeded'));

      const mockClient = {
        models: { generateContent: mockGenerateContent },
      } as any;

      setAiClientForTesting(mockClient);

      const plan = await generateAiPlan(mockBasePlan, mockAqData, mockPreferences);
      expect(plan.isAiGenerated).toBe(false);
      expect(plan.isFallback).toBe(true);
    });
  });

  describe('Gemini Model Configuration', () => {
    it('uses gemini-3.8-flash by default for plan generation and chat', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          summary: 'Summary text',
          keyMessage: 'Key message text',
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        }),
      });

      const mockClient = {
        models: { generateContent: mockGenerateContent },
      } as any;

      setAiClientForTesting(mockClient);

      await generateAiPlan(mockBasePlan, mockAqData, mockPreferences);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.8-flash',
        })
      );

      mockGenerateContent.mockClear();
      mockGenerateContent.mockResolvedValue({ text: 'Airwise response' });

      await handleChatMessage('How to protect my lungs today?', mockAqData, mockPreferences);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.8-flash',
        })
      );
    });
  });

  describe('withTimeout utility', () => {
    it('resolves normally if promise settles within timeout', async () => {
      const quickPromise = Promise.resolve('success');
      const result = await withTimeout(quickPromise, 1000, 'Test Operation');
      expect(result).toBe('success');
    });

    it('rejects with descriptive error if promise times out', async () => {
      const hangingPromise = new Promise(resolve => setTimeout(resolve, 500));
      await expect(withTimeout(hangingPromise, 50, 'Slow Operation')).rejects.toThrow(
        'Slow Operation timed out after 50ms'
      );
    });
  });
});
