/**
 * AIRWISE Client — Core Type Definitions
 *
 * IMPORTANT: This file mirrors `server/src/types/index.ts`.
 * Both files define the same domain types because the client and server
 * are separate TypeScript compilation units with incompatible module
 * resolution strategies (bundler vs. Node ESM). Any structural change
 * to a shared type must be applied to both files to maintain contract
 * consistency. The server version is authoritative.
 */

export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
export type AqiStandard = 'CPCB_India' | 'US_EPA' | 'European';
export type PollutantId = 'pm25' | 'pm10' | 'no2' | 'so2' | 'o3' | 'co' | 'nh3' | 'pb';
export type DataType = 'model_estimate' | 'station_observation' | 'forecast' | 'user_provided';
export type FreshnessStatus = 'fresh' | 'recent' | 'stale' | 'expired';

export interface PollutantReading {
  id: PollutantId;
  name: string;
  value: number;
  unit: string;
  subIndex: number | null;
  averagingPeriod: string;
}

export interface HourlyForecastPoint {
  time: string;
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  category: AqiCategory | null;
}

export interface AirQualityData {
  aqi: number;
  category: AqiCategory;
  standard: AqiStandard;
  prominentPollutant: PollutantId;
  pollutants: PollutantReading[];
  location: {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  };
  metadata: {
    provider: string;
    dataType: DataType;
    observationTime: string;
    retrievalTime: string;
    freshnessStatus: FreshnessStatus;
    modelSource?: string;
    stationName?: string;
    attribution: string;
  };
  hourlyForecast?: HourlyForecastPoint[];
}

export type CommuteMode = 'car' | 'motorcycle' | 'auto_rickshaw' | 'bus' | 'metro' | 'bicycle' | 'walk' | 'work_from_home';
export type ExerciseType = 'running' | 'walking' | 'cycling' | 'yoga' | 'gym' | 'sports' | 'none';
export type ExerciseLocation = 'outdoor' | 'indoor' | 'both';
export type VentilationType = 'windows_open' | 'ac_only' | 'mixed' | 'cooler';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface UserPreferences {
  location: {
    city: string;
    latitude: number;
    longitude: number;
  };
  schedule: {
    wakeUpTime: string;
    sleepTime: string;
    workStartTime?: string;
    workEndTime?: string;
  };
  lifestyle: {
    commuteMode: CommuteMode;
    commuteDurationMinutes?: number;
    exerciseType: ExerciseType;
    exerciseLocation: ExerciseLocation;
    exerciseTime?: TimeOfDay;
    outdoorActivities: string[];
  };
  home: {
    ventilationType: VentilationType;
    hasAirPurifier: boolean;
    hasIndoorPlants: boolean;
    cookingFuel?: 'gas' | 'electric' | 'induction' | 'wood' | 'mixed';
    hasExhaust: boolean;
  };
  sensitivity?: {
    hasChildren: boolean;
    hasElderly: boolean;
    hasSensitiveMembers: boolean;
  };
}

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory = 'outdoor_activity' | 'commute' | 'ventilation' | 'indoor_air' | 'exercise' | 'children' | 'cooking' | 'sustainable' | 'general';
export type ImpactType = 'exposure_reduction' | 'emission_reduction' | 'both' | 'health_benefit';

export interface Recommendation {
  id: string;
  action: string;
  reason: string;
  context: string;
  expectedBenefit: string;
  limitation: string;
  source?: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  timeOfDay: TimeOfDay;
  impactType: ImpactType;
  isCompleted?: boolean;
}

export interface DailyActionPlan {
  date: string;
  location: string;
  currentAqi: number;
  aqiCategory: AqiCategory;
  generatedAt: string;
  isAiGenerated: boolean;
  isFallback: boolean;
  morning: Recommendation[];
  afternoon: Recommendation[];
  evening: Recommendation[];
  night: Recommendation[];
  summary: string;
  keyMessage: string;
}

export type RoomType = 'living_room' | 'bedroom' | 'kitchen' | 'study';

export interface IndoorRecommendation {
  room: RoomType;
  recommendations: Recommendation[];
  pollutantSources: string[];
  ventilationAdvice: string;
  purifierAdvice?: string;
}

export interface SustainableAlternative {
  id: string;
  currentBehavior: string;
  suggestedAlternative: string;
  exposureImpact: string;
  emissionImpact: string;
  otherBenefits: string;
  practicalConsideration: string;
  safetyNote?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isAiGenerated: boolean;
  sources?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    cached: boolean;
    provider?: string;
  };
}
