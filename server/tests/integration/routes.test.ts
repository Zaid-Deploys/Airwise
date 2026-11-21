import { describe, it, expect } from 'vitest';
import {
  airQualityRequestSchema,
  actionPlanRequestSchema,
  chatRequestSchema,
  indoorRequestSchema,
  sustainableRequestSchema,
} from '../../src/schemas/index.js';
import type { UserPreferences } from '../../src/types/index.js';

const validPreferences: UserPreferences = {
  location: { city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 },
  schedule: { wakeUpTime: '06:00', sleepTime: '22:00' },
  lifestyle: {
    commuteMode: 'metro',
    commuteDurationMinutes: 30,
    exerciseType: 'walking',
    exerciseLocation: 'outdoor',
    outdoorActivities: [],
  },
  home: {
    ventilationType: 'windows_open',
    hasAirPurifier: true,
    hasIndoorPlants: false,
    cookingFuel: 'gas',
    hasExhaust: true,
  },
  sensitivity: {
    hasChildren: false,
    hasElderly: false,
    hasSensitiveMembers: false,
  },
};

describe('API Contract & Schema Validation Tests', () => {
  describe('Air Quality Request Schema', () => {
    it('accepts valid geographic coordinates and city', () => {
      const valid = airQualityRequestSchema.safeParse({
        latitude: 28.6139,
        longitude: 77.2090,
        city: 'New Delhi',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects out-of-range latitude (> 90 or < -90)', () => {
      const invalidLat = airQualityRequestSchema.safeParse({
        latitude: 95.0,
        longitude: 77.2,
        city: 'Delhi',
      });
      expect(invalidLat.success).toBe(false);
    });

    it('rejects out-of-range longitude (> 180 or < -180)', () => {
      const invalidLon = airQualityRequestSchema.safeParse({
        latitude: 28.0,
        longitude: 195.0,
        city: 'Delhi',
      });
      expect(invalidLon.success).toBe(false);
    });

    it('rejects empty city name', () => {
      const emptyCity = airQualityRequestSchema.safeParse({
        latitude: 28.0,
        longitude: 77.0,
        city: '   ',
      });
      expect(emptyCity.success).toBe(false);
    });
  });

  describe('Action Plan Request Schema', () => {
    it('accepts valid user preferences structure', () => {
      const valid = actionPlanRequestSchema.safeParse({
        preferences: validPreferences,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects invalid wakeUpTime format (must be HH:MM)', () => {
      const invalidTime = actionPlanRequestSchema.safeParse({
        preferences: {
          ...validPreferences,
          schedule: { ...validPreferences.schedule, wakeUpTime: '6am' },
        },
      });
      expect(invalidTime.success).toBe(false);
    });

    it('rejects unknown commute mode', () => {
      const invalidCommute = actionPlanRequestSchema.safeParse({
        preferences: {
          ...validPreferences,
          lifestyle: { ...validPreferences.lifestyle, commuteMode: 'rocket' },
        },
      });
      expect(invalidCommute.success).toBe(false);
    });
  });

  describe('Chat Request Schema', () => {
    it('accepts valid message with preferences and history', () => {
      const valid = chatRequestSchema.safeParse({
        message: 'Should I exercise outside today?',
        preferences: validPreferences,
        conversationHistory: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
      });
      expect(valid.success).toBe(true);
    });

    it('rejects empty message', () => {
      const emptyMsg = chatRequestSchema.safeParse({
        message: '   ',
        preferences: validPreferences,
      });
      expect(emptyMsg.success).toBe(false);
    });

    it('rejects messages exceeding 2000 characters to prevent buffer abuse', () => {
      const hugeMsg = chatRequestSchema.safeParse({
        message: 'a'.repeat(2500),
        preferences: validPreferences,
      });
      expect(hugeMsg.success).toBe(false);
    });
  });

  describe('Indoor & Sustainable Request Schemas', () => {
    it('accepts valid room filter or undefined room', () => {
      expect(indoorRequestSchema.safeParse({ preferences: validPreferences, room: 'bedroom' }).success).toBe(true);
      expect(indoorRequestSchema.safeParse({ preferences: validPreferences }).success).toBe(true);
      expect(indoorRequestSchema.safeParse({ preferences: validPreferences, room: 'garage' }).success).toBe(false);
    });

    it('accepts valid sustainable alternatives request', () => {
      expect(sustainableRequestSchema.safeParse({ preferences: validPreferences }).success).toBe(true);
    });
  });
});
