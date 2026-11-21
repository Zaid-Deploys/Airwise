/**
 * AIRWISE — Request & Response Validation Schemas
 * Uses Zod for runtime type checking of all API boundaries.
 */

import { z } from 'zod';

// ============================================
// Request Schemas
// ============================================

export const locationSchema = z.object({
  city: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const scheduleSchema = z.object({
  wakeUpTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  sleepTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  workStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  workEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

export const lifestyleSchema = z.object({
  commuteMode: z.enum(['car', 'motorcycle', 'auto_rickshaw', 'bus', 'metro', 'bicycle', 'walk', 'work_from_home']),
  commuteDurationMinutes: z.number().int().min(0).max(300).optional(),
  exerciseType: z.enum(['running', 'walking', 'cycling', 'yoga', 'gym', 'sports', 'none']),
  exerciseLocation: z.enum(['outdoor', 'indoor', 'both']),
  exerciseTime: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  outdoorActivities: z.array(z.string().max(100)).max(10).default([]),
});

export const homeSchema = z.object({
  ventilationType: z.enum(['windows_open', 'ac_only', 'mixed', 'cooler']),
  hasAirPurifier: z.boolean(),
  hasIndoorPlants: z.boolean(),
  cookingFuel: z.enum(['gas', 'electric', 'induction', 'wood', 'mixed']).optional(),
  hasExhaust: z.boolean(),
});

export const sensitivitySchema = z.object({
  hasChildren: z.boolean(),
  hasElderly: z.boolean(),
  hasSensitiveMembers: z.boolean(),
}).optional();

export const userPreferencesSchema = z.object({
  location: locationSchema,
  schedule: scheduleSchema,
  lifestyle: lifestyleSchema,
  home: homeSchema,
  sensitivity: sensitivitySchema,
});

export const airQualityRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(1).max(100),
});

export const actionPlanRequestSchema = z.object({
  preferences: userPreferencesSchema,
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  preferences: userPreferencesSchema,
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(5000),
  })).max(20).default([]),
});

export const indoorRequestSchema = z.object({
  room: z.enum(['living_room', 'bedroom', 'kitchen', 'study']).optional(),
  preferences: userPreferencesSchema,
});

export const sustainableRequestSchema = z.object({
  preferences: userPreferencesSchema,
});

// Type exports
export type LocationInput = z.infer<typeof locationSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type LifestyleInput = z.infer<typeof lifestyleSchema>;
export type HomeInput = z.infer<typeof homeSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type AirQualityRequest = z.infer<typeof airQualityRequestSchema>;
export type ActionPlanRequest = z.infer<typeof actionPlanRequestSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type IndoorRequest = z.infer<typeof indoorRequestSchema>;
export type SustainableRequest = z.infer<typeof sustainableRequestSchema>;
