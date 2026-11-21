import { describe, it, expect } from 'vitest';
import {
  calculateSubIndex,
  getAqiCategory,
  calculateCpcbAqi,
  getHealthAdvisory,
} from '../../src/engine/aqi-calculator.js';

describe('CPCB National AQI Calculator', () => {
  describe('Sub-Index Calculations', () => {
    it('calculates PM2.5 sub-index correctly across category breakpoints', () => {
      // Good category: 0 to 30 -> 0 to 50
      expect(calculateSubIndex('pm25', 0)).toBe(0);
      expect(calculateSubIndex('pm25', 15)).toBe(25);
      expect(calculateSubIndex('pm25', 30)).toBe(50);

      // Satisfactory: 31 to 60 -> 51 to 100
      expect(calculateSubIndex('pm25', 45)).toBe(75);
      expect(calculateSubIndex('pm25', 60)).toBe(100);

      // Moderate: 61 to 90 -> 101 to 200
      expect(calculateSubIndex('pm25', 75)).toBe(149);
      expect(calculateSubIndex('pm25', 90)).toBe(200);

      // Poor: 91 to 120 -> 201 to 300
      expect(calculateSubIndex('pm25', 105)).toBe(249);
      expect(calculateSubIndex('pm25', 120)).toBe(300);

      // Very Poor: 121 to 250 -> 301 to 400
      expect(calculateSubIndex('pm25', 185)).toBe(350);
      expect(calculateSubIndex('pm25', 250)).toBe(400);

      // Severe: 250 to 380 -> 401 to 500 (401 + (99/130)*65 = 450.5 -> rounds to 451)
      expect(calculateSubIndex('pm25', 315)).toBe(451);
    });

    it('calculates PM10 sub-index correctly', () => {
      expect(calculateSubIndex('pm10', 50)).toBe(50);
      expect(calculateSubIndex('pm10', 100)).toBe(100);
      expect(calculateSubIndex('pm10', 250)).toBe(200);
      expect(calculateSubIndex('pm10', 350)).toBe(300);
      expect(calculateSubIndex('pm10', 430)).toBe(400);
    });

    it('calculates CO sub-index in mg/m³', () => {
      // CO 0 to 1 mg/m³ -> 0 to 50
      expect(calculateSubIndex('co', 1.0)).toBe(50);
      // CO 1.1 to 2 mg/m³ -> 51 to 100
      expect(calculateSubIndex('co', 2.0)).toBe(100);
      // CO 2.1 to 10 mg/m³ -> 101 to 200
      expect(calculateSubIndex('co', 10.0)).toBe(200);
    });

    it('caps values above maximum breakpoint at 500', () => {
      expect(calculateSubIndex('pm25', 600)).toBe(500);
      expect(calculateSubIndex('pm10', 900)).toBe(500);
    });

    it('returns null for negative concentration or unknown pollutant', () => {
      expect(calculateSubIndex('pm25', -10)).toBeNull();
      expect(calculateSubIndex('unknown_gas', 50)).toBeNull();
    });
  });

  describe('AQI Category Classification', () => {
    it('classifies values into the official 6 CPCB categories', () => {
      expect(getAqiCategory(35).category).toBe('Good');
      expect(getAqiCategory(50).category).toBe('Good');
      expect(getAqiCategory(75).category).toBe('Satisfactory');
      expect(getAqiCategory(100).category).toBe('Satisfactory');
      expect(getAqiCategory(150).category).toBe('Moderate');
      expect(getAqiCategory(200).category).toBe('Moderate');
      expect(getAqiCategory(250).category).toBe('Poor');
      expect(getAqiCategory(300).category).toBe('Poor');
      expect(getAqiCategory(350).category).toBe('Very Poor');
      expect(getAqiCategory(400).category).toBe('Very Poor');
      expect(getAqiCategory(450).category).toBe('Severe');
      expect(getAqiCategory(500).category).toBe('Severe');
    });
  });

  describe('Overall CPCB NAQI Calculation & Maximum Operator Rule', () => {
    it('selects the maximum sub-index as the final AQI (Prominent Pollutant)', () => {
      const result = calculateCpcbAqi({
        pm25: 110, // Poor: ~266
        pm10: 80,  // Satisfactory: ~80
        no2: 30,   // Good: ~38
        co: 1500,  // 1.5 mg/m³ -> Satisfactory: ~73
        o3: 40,    // Good: ~40
      });

      expect(result.isValid).toBe(true);
      expect(result.prominentPollutant).toBe('pm25');
      expect(result.category).toBe('Poor');
      expect(result.aqi).toBeGreaterThanOrEqual(260);
      expect(result.aqi).toBeLessThanOrEqual(275);
    });

    it('identifies NO2 as prominent pollutant if its sub-index exceeds particulate sub-index', () => {
      const result = calculateCpcbAqi({
        pm25: 25,  // Good: ~42
        pm10: 40,  // Good: ~40
        no2: 250,  // Poor: subindex 201-300
        co: 500,   // Good
      });

      expect(result.isValid).toBe(true);
      expect(result.prominentPollutant).toBe('no2');
      expect(result.category).toBe('Poor');
    });

    it('enforces CPCB prerequisite: minimum 3 pollutants with at least one PM', () => {
      // Only 2 pollutants
      const invalidTwo = calculateCpcbAqi({
        pm25: 50,
        no2: 40,
      });
      expect(invalidTwo.isValid).toBe(false);
      expect(invalidTwo.warnings.some(w => w.includes('minimum 3'))).toBe(true);

      // 3 pollutants but no PM2.5 and no PM10
      const invalidNoPm = calculateCpcbAqi({
        no2: 50,
        so2: 40,
        co: 1000,
      });
      expect(invalidNoPm.isValid).toBe(false);
      expect(invalidNoPm.warnings.some(w => w.includes('Neither PM2.5 nor PM10'))).toBe(true);

      // Valid: 3 pollutants including PM2.5
      const valid = calculateCpcbAqi({
        pm25: 50,
        no2: 40,
        so2: 30,
      });
      expect(valid.isValid).toBe(true);
    });
  });

  describe('Health Advisory Mapping', () => {
    it('returns practical advisory text reflecting CPCB guidelines', () => {
      const severeAdvisory = getHealthAdvisory('Severe');
      expect(severeAdvisory.outdoorActivity).toContain('Do not exercise outdoors');

      const goodAdvisory = getHealthAdvisory('Good');
      expect(goodAdvisory.outdoorActivity).toContain('normally');
    });
  });
});
