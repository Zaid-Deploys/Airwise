/**
 * AIRWISE — Open-Meteo Provider Adapter Unit Tests
 * 
 * Verifies environmental data ingestion, CAMS response normalization,
 * TTL caching, and error resilience using controlled fixtures.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchAirQuality,
  clearCache,
  getCacheStats,
} from '../../src/providers/open-meteo.js';

const mockApiResponse = {
  latitude: 28.6,
  longitude: 77.2,
  generationtime_ms: 0.5,
  utc_offset_seconds: 19800,
  timezone: 'Asia/Kolkata',
  timezone_abbreviation: 'IST',
  elevation: 214,
  hourly_units: {
    time: 'iso8601',
    pm2_5: 'μg/m³',
    pm10: 'μg/m³',
    nitrogen_dioxide: 'μg/m³',
    sulphur_dioxide: 'μg/m³',
    ozone: 'μg/m³',
    carbon_monoxide: 'μg/m³',
  },
  hourly: {
    time: [
      '2026-11-18T00:00',
      '2026-11-18T01:00',
      '2026-11-18T02:00',
      '2026-11-18T03:00',
      '2026-11-18T04:00',
    ],
    pm2_5: [180.5, 195.2, 210.0, 220.4, 215.1],
    pm10: [290.0, 310.5, 330.0, 340.2, 335.0],
    nitrogen_dioxide: [55.0, 60.2, 65.0, 70.1, 68.0],
    sulphur_dioxide: [20.0, 22.0, 24.0, 25.0, 23.0],
    ozone: [30.0, 25.0, 20.0, 22.0, 25.0],
    carbon_monoxide: [1200.0, 1300.0, 1400.0, 1500.0, 1450.0],
    us_aqi: [230, 245, 260, 270, 265],
    european_aqi: [80, 85, 90, 95, 92],
  },
};

describe('Open-Meteo Provider Unit Tests', () => {
  beforeEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearCache();
    vi.restoreAllMocks();
  });

  it('correctly normalizes CAMS data and computes authentic CPCB NAQI', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as Response);

    const result = await fetchAirQuality(28.6139, 77.209, 'New Delhi');

    expect(result.standard).toBe('CPCB_India');
    expect(result.location.name).toBe('New Delhi');
    expect(result.metadata.provider).toBe('Open-Meteo');
    expect(result.metadata.modelSource).toBe('Copernicus CAMS (ECMWF)');
    expect(result.metadata.dataType).toBe('model_estimate');
    expect(result.pollutants.length).toBeGreaterThanOrEqual(4);
    expect(result.prominentPollutant).toBeDefined();
    expect(result.aqi).toBeGreaterThan(0);
  });

  it('utilizes in-memory TTL cache to prevent redundant HTTP requests', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as Response);

    // First call (fetches over network)
    await fetchAirQuality(28.6139, 77.209, 'New Delhi');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getCacheStats().size).toBe(1);

    // Second call with same coordinates (serves from cache)
    await fetchAirQuality(28.6139, 77.209, 'New Delhi');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles missing pollutant parameters gracefully without throwing', async () => {
    const partialResponse = {
      ...mockApiResponse,
      hourly: {
        time: ['2026-11-18T00:00'],
        pm2_5: [120.0],
        pm10: [180.0],
        nitrogen_dioxide: [40.0],
        // so2, o3, co omitted
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => partialResponse,
    } as Response);

    const result = await fetchAirQuality(19.076, 72.8777, 'Mumbai');
    expect(result.aqi).toBeGreaterThan(0);
    expect(result.pollutants.some(p => p.id === 'pm25')).toBe(true);
  });

  it('throws descriptive error when upstream API returns 502/500 error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    } as Response);

    await expect(fetchAirQuality(28.6139, 77.209, 'New Delhi')).rejects.toThrow(
      'Open-Meteo API error: 502 Bad Gateway'
    );
  });

  it('throws descriptive error on network timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(abortError);

    await expect(fetchAirQuality(28.6139, 77.209, 'New Delhi')).rejects.toThrow(
      'Open-Meteo API request timed out'
    );
  });
});
