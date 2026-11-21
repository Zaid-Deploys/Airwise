/**
 * CPCB India National Air Quality Index Calculator
 * 
 * Implements the official AQI methodology published by the
 * Central Pollution Control Board (CPCB), India.
 * 
 * Reference: National Air Quality Index (2014)
 * Published by: CPCB, Ministry of Environment, Forest and Climate Change
 * 
 * The AQI is calculated using the formula:
 *   I = I_LO + ((I_HI - I_LO) / (B_HI - B_LO)) * (C - B_LO)
 * 
 * where:
 *   C = measured pollutant concentration
 *   B_HI = breakpoint concentration ≥ C
 *   B_LO = breakpoint concentration ≤ C
 *   I_HI = AQI value corresponding to B_HI
 *   I_LO = AQI value corresponding to B_LO
 * 
 * Final AQI = max of all sub-indices
 * The pollutant with the highest sub-index is the "Prominent Pollutant"
 */

import type { AqiCategory, PollutantId, PollutantReading } from '../types/index.js';

/** CPCB Breakpoint entry: [B_LO, B_HI, I_LO, I_HI] */
type Breakpoint = [number, number, number, number];

/**
 * Official CPCB AQI Breakpoint Tables
 * Source: CPCB National Air Quality Index document, 2014
 * 
 * Methodological Note on CPCB Averaging Periods vs Model Estimates:
 * Official statutory CPCB NAQI values are defined for 24-hour continuous rolling averages
 * (for PM2.5, PM10, NO2, SO2, NH3, Pb) and 8-hour averages (for CO, O3) recorded at
 * physical Continuous Ambient Air Quality Monitoring Stations (CAAQMS).
 * When calculated from hourly atmospheric model forecasts (such as Copernicus CAMS estimates),
 * the calculated sub-indices serve as instantaneous concentration proxies rather than
 * official statutory 24-hour ground station observations.
 * 
 * Pollutant concentrations in μg/m³ unless noted.
 * CO is in mg/m³ (converted from μg/m³ in provider data).
 * 
 * Standard statutory averaging periods:
 *   PM2.5: 24-hour
 *   PM10: 24-hour  
 *   NO2: 24-hour
 *   SO2: 24-hour
 *   CO: 8-hour (mg/m³)
 *   O3: 8-hour
 *   NH3: 24-hour
 *   Pb: 24-hour
 */
const BREAKPOINTS: Record<string, Breakpoint[]> = {
  // PM2.5 (μg/m³, 24-hour average)
  pm25: [
    [0, 30, 0, 50],       // Good
    [31, 60, 51, 100],    // Satisfactory
    [61, 90, 101, 200],   // Moderate
    [91, 120, 201, 300],  // Poor
    [121, 250, 301, 400], // Very Poor
    [250, 380, 401, 500], // Severe (using upper bound for calculation)
  ],
  // PM10 (μg/m³, 24-hour average)
  pm10: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [430, 510, 401, 500],
  ],
  // NO2 (μg/m³, 24-hour average)
  no2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 180, 101, 200],
    [181, 280, 201, 300],
    [281, 400, 301, 400],
    [400, 520, 401, 500],
  ],
  // SO2 (μg/m³, 24-hour average)
  so2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 380, 101, 200],
    [381, 800, 201, 300],
    [801, 1600, 301, 400],
    [1600, 2100, 401, 500],
  ],
  // CO (mg/m³, 8-hour average) — NOTE: input from Open-Meteo is μg/m³, must convert
  co: [
    [0, 1, 0, 50],
    [1.1, 2, 51, 100],
    [2.1, 10, 101, 200],
    [10.1, 17, 201, 300],
    [17.1, 34, 301, 400],
    [34, 46, 401, 500],
  ],
  // O3 (μg/m³, 8-hour average)
  o3: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 168, 101, 200],
    [169, 208, 201, 300],
    [209, 748, 301, 400],
    [748, 960, 401, 500],
  ],
  // NH3 (μg/m³, 24-hour average)
  nh3: [
    [0, 200, 0, 50],
    [201, 400, 51, 100],
    [401, 800, 101, 200],
    [801, 1200, 201, 300],
    [1201, 1800, 301, 400],
    [1800, 2400, 401, 500],
  ],
  // Lead (μg/m³, 24-hour average)
  pb: [
    [0, 0.5, 0, 50],
    [0.51, 1.0, 51, 100],
    [1.1, 2.0, 101, 200],
    [2.1, 3.0, 201, 300],
    [3.1, 3.5, 301, 400],
    [3.5, 4.0, 401, 500],
  ],
};

/** Human-readable pollutant names */
const POLLUTANT_NAMES: Record<string, string> = {
  pm25: 'PM2.5 (Fine Particulate Matter)',
  pm10: 'PM10 (Coarse Particulate Matter)',
  no2: 'Nitrogen Dioxide',
  so2: 'Sulphur Dioxide',
  co: 'Carbon Monoxide',
  o3: 'Ozone',
  nh3: 'Ammonia',
  pb: 'Lead',
};

/** Units for each pollutant */
const POLLUTANT_UNITS: Record<string, string> = {
  pm25: 'μg/m³',
  pm10: 'μg/m³',
  no2: 'μg/m³',
  so2: 'μg/m³',
  co: 'mg/m³',
  o3: 'μg/m³',
  nh3: 'μg/m³',
  pb: 'μg/m³',
};

/** Averaging periods */
const AVERAGING_PERIODS: Record<string, string> = {
  pm25: '24-hour',
  pm10: '24-hour',
  no2: '24-hour',
  so2: '24-hour',
  co: '8-hour',
  o3: '8-hour',
  nh3: '24-hour',
  pb: '24-hour',
};

/** AQI category thresholds */
const AQI_CATEGORIES: { max: number; category: AqiCategory; color: string; description: string }[] = [
  { max: 50, category: 'Good', color: '#009966', description: 'Minimal impact on health' },
  { max: 100, category: 'Satisfactory', color: '#58BE2D', description: 'Minor breathing discomfort to sensitive people' },
  { max: 200, category: 'Moderate', color: '#FFDD44', description: 'Breathing discomfort to people with lung/heart conditions, children, elderly' },
  { max: 300, category: 'Poor', color: '#FF6633', description: 'Breathing discomfort on prolonged exposure' },
  { max: 400, category: 'Very Poor', color: '#CC0033', description: 'Respiratory illness on prolonged exposure' },
  { max: 500, category: 'Severe', color: '#660000', description: 'Serious health impacts on everyone; affects healthy people too' },
];

/**
 * Calculate the sub-index for a single pollutant using CPCB formula
 */
export function calculateSubIndex(pollutantId: string, concentration: number): number | null {
  const breakpoints = BREAKPOINTS[pollutantId];
  if (!breakpoints) return null;
  if (concentration < 0) return null;

  // Find the matching breakpoint range
  for (const [bLo, bHi, iLo, iHi] of breakpoints) {
    if (concentration >= bLo && concentration <= bHi) {
      // CPCB formula: I = I_LO + ((I_HI - I_LO) / (B_HI - B_LO)) * (C - B_LO)
      const subIndex = iLo + ((iHi - iLo) / (bHi - bLo)) * (concentration - bLo);
      return Math.round(subIndex);
    }
  }

  // Concentration exceeds the highest breakpoint
  const lastBp = breakpoints[breakpoints.length - 1];
  if (lastBp && concentration > lastBp[1]) {
    // Cap at 500 (CPCB max) but indicate it's beyond scale
    return 500;
  }

  return null;
}

/**
 * Get the AQI category for a given AQI value
 */
export function getAqiCategory(aqi: number): { category: AqiCategory; color: string; description: string } {
  for (const cat of AQI_CATEGORIES) {
    if (aqi <= cat.max) {
      return { category: cat.category, color: cat.color, description: cat.description };
    }
  }
  // AQI_CATEGORIES is a non-empty constant array, so the last element always exists.
  const lastCategory = AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
  return { category: lastCategory.category, color: lastCategory.color, description: lastCategory.description };
}

/**
 * Input pollutant concentrations from a data provider.
 * CO should be in μg/m³ (will be converted to mg/m³ internally).
 * All others should be in μg/m³.
 */
export interface PollutantConcentrations {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;  // μg/m³ from provider, converted to mg/m³ for CPCB
  o3?: number | null;
  nh3?: number | null;
  pb?: number | null;
}

/**
 * Result of AQI calculation
 */
export interface AqiCalculationResult {
  /** Overall AQI value (max of all sub-indices) */
  aqi: number;
  /** AQI category */
  category: AqiCategory;
  /** Category color */
  color: string;
  /** Health description for this category */
  description: string;
  /** The pollutant with highest sub-index */
  prominentPollutant: PollutantId;
  /** All computed pollutant readings */
  pollutants: PollutantReading[];
  /** Whether enough data was available for a valid calculation */
  isValid: boolean;
  /** Warning messages */
  warnings: string[];
}

/**
 * Calculate CPCB India AQI from raw pollutant concentrations.
 * 
 * Rules:
 * - Minimum 3 pollutants required for valid AQI
 * - At least one must be PM2.5 or PM10
 * - Final AQI = max(all sub-indices)
 * - Prominent pollutant = pollutant with highest sub-index
 */
export function calculateCpcbAqi(concentrations: PollutantConcentrations): AqiCalculationResult {
  const warnings: string[] = [];
  const pollutantReadings: PollutantReading[] = [];
  let maxSubIndex = 0;
  let prominentPollutant: PollutantId = 'pm25';
  let hasPM = false;
  let validCount = 0;

  const entries: { id: string; value: number | null | undefined }[] = [
    { id: 'pm25', value: concentrations.pm25 },
    { id: 'pm10', value: concentrations.pm10 },
    { id: 'no2', value: concentrations.no2 },
    { id: 'so2', value: concentrations.so2 },
    { id: 'co', value: concentrations.co != null ? concentrations.co / 1000 : null }, // μg/m³ → mg/m³
    { id: 'o3', value: concentrations.o3 },
    { id: 'nh3', value: concentrations.nh3 },
    { id: 'pb', value: concentrations.pb },
  ];

  for (const { id, value } of entries) {
    if (value == null || isNaN(value)) {
      continue;
    }

    const subIndex = calculateSubIndex(id, value);
    if (subIndex == null) {
      warnings.push(`Could not calculate sub-index for ${POLLUTANT_NAMES[id]} (value: ${value})`);
      continue;
    }

    validCount++;
    if (id === 'pm25' || id === 'pm10') {
      hasPM = true;
    }

    // Store the display value — for CO, convert back to μg/m³ for display
    const displayValue = id === 'co' ? value * 1000 : value;
    const displayUnit = id === 'co' ? 'μg/m³' : POLLUTANT_UNITS[id] || 'μg/m³';

    pollutantReadings.push({
      id: id as PollutantId,
      name: POLLUTANT_NAMES[id] || id,
      value: Math.round(displayValue * 10) / 10,
      unit: displayUnit,
      subIndex,
      averagingPeriod: AVERAGING_PERIODS[id] || 'unknown',
    });

    if (subIndex > maxSubIndex) {
      maxSubIndex = subIndex;
      prominentPollutant = id as PollutantId;
    }
  }

  // CPCB validity rule: minimum 3 pollutants, including PM2.5 or PM10
  const isValid = validCount >= 3 && hasPM;

  if (!hasPM) {
    warnings.push('Neither PM2.5 nor PM10 data available — CPCB requires at least one for valid AQI');
  }
  if (validCount < 3) {
    warnings.push(`Only ${validCount} pollutant(s) available — CPCB requires minimum 3 for valid AQI`);
  }

  const aqi = Math.round(maxSubIndex);
  const { category, color, description } = getAqiCategory(aqi);

  // Sort pollutants by sub-index (highest first)
  pollutantReadings.sort((a, b) => (b.subIndex ?? 0) - (a.subIndex ?? 0));

  return {
    aqi,
    category,
    color,
    description,
    prominentPollutant,
    pollutants: pollutantReadings,
    isValid,
    warnings,
  };
}

/**
 * Get all AQI category definitions (for UI display)
 */
export function getAqiCategories() {
  return AQI_CATEGORIES.map(c => ({ ...c }));
}

/**
 * Get health advisory text for an AQI category
 */
export function getHealthAdvisory(category: AqiCategory): {
  general: string;
  sensitiveGroups: string;
  outdoorActivity: string;
} {
  switch (category) {
    case 'Good':
      return {
        general: 'Air quality is satisfactory. Enjoy outdoor activities normally.',
        sensitiveGroups: 'No specific precautions needed.',
        outdoorActivity: 'All outdoor activities can be carried out normally.',
      };
    case 'Satisfactory':
      return {
        general: 'Air quality is acceptable. Some pollutants may be a concern for unusually sensitive individuals.',
        sensitiveGroups: 'People with respiratory conditions may experience minor discomfort.',
        outdoorActivity: 'Outdoor activities can generally proceed. Sensitive individuals should monitor symptoms.',
      };
    case 'Moderate':
      return {
        general: 'Air quality is moderately polluted. May cause breathing discomfort to sensitive groups.',
        sensitiveGroups: 'Children, elderly, and people with lung/heart conditions should limit prolonged outdoor exertion.',
        outdoorActivity: 'Reduce prolonged outdoor exertion. Consider indoor alternatives for strenuous exercise.',
      };
    case 'Poor':
      return {
        general: 'Air quality is poor. Breathing discomfort likely on prolonged exposure for most people.',
        sensitiveGroups: 'Sensitive groups should avoid outdoor activities. Use air purifiers indoors if available.',
        outdoorActivity: 'Avoid prolonged outdoor activities. Shift exercise indoors. Keep windows closed.',
      };
    case 'Very Poor':
      return {
        general: 'Air quality is very poor. May cause respiratory illness on prolonged exposure.',
        sensitiveGroups: 'Sensitive groups should stay indoors. Use N95 masks if going outside is necessary.',
        outdoorActivity: 'Avoid all outdoor physical activities. Keep windows and doors closed.',
      };
    case 'Severe':
      return {
        general: 'Air quality is severe. Health impacts even for healthy individuals. Avoid all outdoor exposure.',
        sensitiveGroups: 'Sensitive groups must stay indoors with air purification. Seek medical attention if symptoms appear.',
        outdoorActivity: 'Do not exercise outdoors under any circumstances. Use N95 masks for essential outdoor trips only.',
      };
  }
}

export { AQI_CATEGORIES, POLLUTANT_NAMES, POLLUTANT_UNITS, BREAKPOINTS };
