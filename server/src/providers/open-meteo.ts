/**
 * Open-Meteo Air Quality API Provider Adapter
 * 
 * Fetches hourly air quality forecast data from the Open-Meteo API
 * which uses CAMS (Copernicus Atmosphere Monitoring Service) global model.
 * 
 * Important: This provides MODEL ESTIMATES, not station observations.
 * Data resolution: ~0.4° (~45km grid) for India.
 * 
 * API Docs: https://open-meteo.com/en/docs/air-quality-api
 * Data Source: Copernicus CAMS (ECMWF)
 * License: CC-BY 4.0 (attribution required)
 * Rate Limits: 10,000/day, 5,000/hour, 600/min (free tier)
 */

import { calculateCpcbAqi } from '../engine/aqi-calculator.js';
import type {
  AirQualityData,
  HourlyForecastPoint,
  FreshnessStatus,
  AqiCategory,
} from '../types/index.js';

/** Raw response shape from Open-Meteo API */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
    sulphur_dioxide?: (number | null)[];
    ozone?: (number | null)[];
    carbon_monoxide?: (number | null)[];
    us_aqi?: (number | null)[];
    european_aqi?: (number | null)[];
  };
}

/** Cache entry with TTL tracking */
interface CacheEntry {
  data: AirQualityData;
  storedAt: number;
  expiresAt: number;
}

/** Provider configuration */
interface OpenMeteoConfig {
  /** Base URL for the API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Number of forecast days */
  forecastDays: number;
}

const DEFAULT_CONFIG: OpenMeteoConfig = {
  baseUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  timeoutMs: 10_000,
  cacheTtlMs: 15 * 60 * 1000, // 15 minutes
  forecastDays: 3,
};

/** In-memory cache keyed by "lat,lon" */
const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from coordinates (rounded to 2 decimal places)
 */
function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/**
 * Determine data freshness based on age
 */
function getFreshnessStatus(observationTime: Date): FreshnessStatus {
  const ageMs = Date.now() - observationTime.getTime();
  const ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes < 60) return 'fresh';
  if (ageMinutes < 180) return 'recent';
  if (ageMinutes < 360) return 'stale';
  return 'expired';
}

/**
 * Find the current hour index in the forecast data
 */
function findCurrentHourIndex(times: string[], timezoneOffset: number): number {
  const now = new Date();
  // Create a comparable ISO string without timezone
  const localNow = new Date(now.getTime() + timezoneOffset * 1000);
  const currentHour = localNow.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

  for (let i = 0; i < times.length; i++) {
    const timeEntry = times[i];
    if (timeEntry && timeEntry.startsWith(currentHour)) {
      return i;
    }
  }

  // Fallback: find the closest past hour
  const nowMs = now.getTime();
  let closestIdx = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const timeMs = new Date(times[i] + 'Z').getTime() - timezoneOffset * 1000;
    const diff = nowMs - timeMs;
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx;
}

/**
 * Fetch air quality data from Open-Meteo
 * 
 * @param latitude - Location latitude
 * @param longitude - Location longitude  
 * @param cityName - Display name for the location
 * @param config - Optional provider configuration overrides
 * @returns Normalized AirQualityData with CPCB AQI
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  cityName: string,
  config: Partial<OpenMeteoConfig> = {}
): Promise<AirQualityData> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = getCacheKey(latitude, longitude);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return {
      ...cached.data,
      metadata: {
        ...cached.data.metadata,
        freshnessStatus: getFreshnessStatus(new Date(cached.data.metadata.observationTime)),
      },
    };
  }

  // Build API URL
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,us_aqi,european_aqi',
    timezone: 'auto',
    forecast_days: cfg.forecastDays.toString(),
  });

  const url = `${cfg.baseUrl}?${params.toString()}`;

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Open-Meteo API request timed out');
    }
    throw new Error(`Failed to fetch air quality data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  let raw: OpenMeteoResponse;
  try {
    raw = await response.json() as OpenMeteoResponse;
  } catch {
    throw new Error('Open-Meteo API returned invalid JSON');
  }

  // Validate response structure
  if (!raw.hourly || !raw.hourly.time || raw.hourly.time.length === 0) {
    throw new Error('Open-Meteo API returned empty or invalid hourly data');
  }

  // Find current hour data
  const currentIdx = findCurrentHourIndex(raw.hourly.time, raw.utc_offset_seconds);
  const retrievalTime = new Date().toISOString();
  const observationTime = raw.hourly.time[currentIdx] || retrievalTime;

  // Extract current concentrations
  const currentConcentrations = {
    pm25: raw.hourly.pm2_5?.[currentIdx] ?? null,
    pm10: raw.hourly.pm10?.[currentIdx] ?? null,
    no2: raw.hourly.nitrogen_dioxide?.[currentIdx] ?? null,
    so2: raw.hourly.sulphur_dioxide?.[currentIdx] ?? null,
    co: raw.hourly.carbon_monoxide?.[currentIdx] ?? null,
    o3: raw.hourly.ozone?.[currentIdx] ?? null,
  };

  // Calculate CPCB AQI from raw concentrations
  const aqiResult = calculateCpcbAqi(currentConcentrations);

  // Build hourly forecast
  const hourlyForecast: HourlyForecastPoint[] = [];
  const forecastStartIdx = currentIdx;
  const forecastEndIdx = Math.min(raw.hourly.time.length, forecastStartIdx + 48); // Next 48 hours

  for (let i = forecastStartIdx; i < forecastEndIdx; i++) {
    const pm25Val = raw.hourly.pm2_5?.[i] ?? null;
    const pm10Val = raw.hourly.pm10?.[i] ?? null;

    // Calculate forecast AQI for each hour
    let forecastAqi: number | null = null;
    let forecastCategory: AqiCategory | null = null;

    if (pm25Val != null || pm10Val != null) {
      const hourResult = calculateCpcbAqi({
        pm25: pm25Val,
        pm10: pm10Val,
        no2: raw.hourly.nitrogen_dioxide?.[i] ?? null,
        so2: raw.hourly.sulphur_dioxide?.[i] ?? null,
        co: raw.hourly.carbon_monoxide?.[i] ?? null,
        o3: raw.hourly.ozone?.[i] ?? null,
      });
      forecastAqi = hourResult.aqi;
      forecastCategory = hourResult.category;
    }

    const hourTime = raw.hourly.time[i] ?? '';
    hourlyForecast.push({
      time: hourTime,
      pm25: pm25Val,
      pm10: pm10Val,
      aqi: forecastAqi,
      category: forecastCategory,
    });
  }

  const result: AirQualityData = {
    aqi: aqiResult.aqi,
    category: aqiResult.category,
    standard: 'CPCB_India',
    prominentPollutant: aqiResult.prominentPollutant,
    pollutants: aqiResult.pollutants,
    location: {
      latitude: raw.latitude,
      longitude: raw.longitude,
      name: cityName,
      country: 'India',
    },
    metadata: {
      provider: 'Open-Meteo',
      dataType: 'model_estimate',
      observationTime,
      retrievalTime,
      freshnessStatus: getFreshnessStatus(new Date(observationTime)),
      modelSource: 'Copernicus CAMS (ECMWF)',
      attribution: 'Air quality data by Open-Meteo.com using Copernicus CAMS atmospheric data',
    },
    hourlyForecast,
  };

  // Update cache
  cache.set(cacheKey, {
    data: result,
    storedAt: Date.now(),
    expiresAt: Date.now() + cfg.cacheTtlMs,
  });

  return result;
}

/**
 * Clear the provider cache (for testing)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
