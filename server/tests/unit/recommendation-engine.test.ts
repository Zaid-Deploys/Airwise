import { describe, it, expect } from 'vitest';
import {
  generateDailyPlan,
  generateIndoorRecommendations,
  generateSustainableAlternatives,
  makeIdGenerator,
} from '../../src/engine/recommendation-engine.js';
import type { AirQualityData, UserPreferences, TimeOfDay } from '../../src/types/index.js';

const createMockAqData = (aqi: number, category: AirQualityData['category']): AirQualityData => ({
  aqi,
  category,
  standard: 'CPCB_India',
  prominentPollutant: 'pm25',
  pollutants: [
    { id: 'pm25', name: 'PM2.5', value: 150, unit: 'μg/m³', subIndex: aqi, averagingPeriod: '24-hour' },
    { id: 'pm10', name: 'PM10', value: 200, unit: 'μg/m³', subIndex: Math.min(aqi, 300), averagingPeriod: '24-hour' },
    { id: 'no2', name: 'NO2', value: 50, unit: 'μg/m³', subIndex: 65, averagingPeriod: '24-hour' },
  ],
  location: {
    latitude: 28.6139,
    longitude: 77.2090,
    name: 'New Delhi',
    country: 'India',
  },
  metadata: {
    provider: 'Open-Meteo',
    dataType: 'model_estimate',
    observationTime: new Date().toISOString(),
    retrievalTime: new Date().toISOString(),
    freshnessStatus: 'fresh',
    attribution: 'Test Data',
  },
});

const mockGoodAqData = createMockAqData(35, 'Good');
const mockSatisfactoryAqData = createMockAqData(87, 'Satisfactory');
const mockModerateAqData = createMockAqData(150, 'Moderate');
const mockPoorAqData = createMockAqData(221, 'Poor');
const mockVeryPoorAqData = createMockAqData(380, 'Very Poor');
const mockSevereAqData = createMockAqData(450, 'Severe');

const defaultPreferences: UserPreferences = {
  location: { city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 },
  schedule: { wakeUpTime: '06:00', sleepTime: '22:00' },
  lifestyle: {
    commuteMode: 'motorcycle',
    commuteDurationMinutes: 40,
    exerciseType: 'running',
    exerciseLocation: 'outdoor',
    exerciseTime: 'morning',
    outdoorActivities: ['running'],
  },
  home: {
    ventilationType: 'windows_open',
    hasAirPurifier: true,
    hasIndoorPlants: true,
    cookingFuel: 'gas',
    hasExhaust: true,
  },
  sensitivity: {
    hasChildren: false,
    hasElderly: false,
    hasSensitiveMembers: false,
  },
};

describe('Deterministic Recommendation Engine', () => {
  describe('Full CPCB Decision Matrix Across 6 Categories', () => {
    const scenarios = [
      { aqi: 35, category: 'Good' as const, data: mockGoodAqData },
      { aqi: 87, category: 'Satisfactory' as const, data: mockSatisfactoryAqData },
      { aqi: 150, category: 'Moderate' as const, data: mockModerateAqData },
      { aqi: 221, category: 'Poor' as const, data: mockPoorAqData },
      { aqi: 380, category: 'Very Poor' as const, data: mockVeryPoorAqData },
      { aqi: 450, category: 'Severe' as const, data: mockSevereAqData },
    ];

    it.each(scenarios)('generates valid plan for AQI $aqi ($category)', ({ aqi, category, data }) => {
      const plan = generateDailyPlan(data, defaultPreferences);
      expect(plan.currentAqi).toBe(aqi);
      expect(plan.aqiCategory).toBe(category);
      expect(plan.morning.length).toBeGreaterThan(0);
      expect(plan.afternoon.length).toBeGreaterThan(0);
      expect(plan.evening.length).toBeGreaterThan(0);
      expect(plan.night.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 1: Priority Calibration & Alarm Fatigue Prevention', () => {
    it('does NOT assign critical to routine indoor cleaning or incense in Good or Satisfactory air', () => {
      const planGood = generateDailyPlan(mockGoodAqData, defaultPreferences);
      const planSat = generateDailyPlan(mockSatisfactoryAqData, defaultPreferences);

      const allGood = [...planGood.morning, ...planGood.afternoon, ...planGood.evening, ...planGood.night];
      const allSat = [...planSat.morning, ...planSat.afternoon, ...planSat.evening, ...planSat.night];

      const incenseGood = allGood.find(r => r.action.toLowerCase().includes('incense'));
      const incenseSat = allSat.find(r => r.action.toLowerCase().includes('incense'));
      expect(incenseGood?.priority).not.toBe('critical');
      expect(incenseSat?.priority).not.toBe('critical');

      const mopGood = allGood.find(r => r.action.toLowerCase().includes('damp'));
      expect(mopGood?.priority).not.toBe('critical');
    });

    it('does NOT assign high priority automatically to air purifier in Good air', () => {
      const plan = generateDailyPlan(mockGoodAqData, defaultPreferences);
      const purifierRec = plan.evening.find(r => r.category === 'indoor_air');
      expect(purifierRec).toBeDefined();
      expect(purifierRec?.priority).toBe('low');
    });

    it('reserves critical priority for genuinely urgent actions (Severe smog, active transit, severe exercise)', () => {
      const planSevere = generateDailyPlan(mockSevereAqData, defaultPreferences);
      const allSevere = [...planSevere.morning, ...planSevere.afternoon, ...planSevere.evening, ...planSevere.night];
      const criticalCards = allSevere.filter(r => r.priority === 'critical');
      expect(criticalCards.length).toBeGreaterThan(0);
      expect(criticalCards.some(r => r.category === 'exercise' || r.category === 'commute')).toBe(true);
    });
  });

  describe('Phase 2: Cooking and Ventilation Correctness', () => {
    it('NEVER tells user to operate an exhaust fan when hasExhaust is false', () => {
      const noExhaustPrefs: UserPreferences = {
        ...defaultPreferences,
        home: { ...defaultPreferences.home, cookingFuel: 'gas', hasExhaust: false },
      };
      const plan = generateDailyPlan(mockSatisfactoryAqData, noExhaustPrefs);
      const cookingRec = plan.afternoon.find(r => r.category === 'cooking');
      expect(cookingRec).toBeDefined();
      expect(cookingRec?.action.toLowerCase()).not.toContain('run kitchen exhaust');
      expect(cookingRec?.action.toLowerCase()).not.toContain('turn kitchen exhaust');
      expect(cookingRec?.action.toLowerCase()).toContain('maximize natural kitchen ventilation');

      // Also check indoor recommendations
      const indoorRooms = generateIndoorRecommendations(mockSatisfactoryAqData, noExhaustPrefs);
      const kitchen = indoorRooms.find(r => r.room === 'kitchen');
      expect(kitchen?.recommendations.some(r => r.action.toLowerCase().includes('turn kitchen exhaust'))).toBe(false);
    });

    it('recommends operating exhaust fan when hasExhaust is true for gas cooking', () => {
      const plan = generateDailyPlan(mockSatisfactoryAqData, defaultPreferences);
      const cookingRec = plan.afternoon.find(r => r.category === 'cooking');
      expect(cookingRec).toBeDefined();
      expect(cookingRec?.action.toLowerCase()).toContain('exhaust fan');
    });

    it('gives clean-cooking source recognition for induction and electric cooktops', () => {
      const inductionPrefs: UserPreferences = {
        ...defaultPreferences,
        home: { ...defaultPreferences.home, cookingFuel: 'induction' },
      };
      const plan = generateDailyPlan(mockGoodAqData, inductionPrefs);
      const cookingRec = plan.afternoon.find(r => r.category === 'cooking');
      expect(cookingRec).toBeDefined();
      expect(cookingRec?.action.toLowerCase()).toContain('induction');
      expect(cookingRec?.priority).toBe('low');
    });

    it('does NOT universally recommend opening windows in Severe AQI', () => {
      const plan = generateDailyPlan(mockSevereAqData, defaultPreferences);
      const afternoonVent = plan.afternoon.find(r => r.category === 'ventilation');
      expect(afternoonVent).toBeDefined();
      expect(afternoonVent?.action.toLowerCase()).toContain('sealed');
      expect(afternoonVent?.action.toLowerCase()).not.toContain('open cross-ventilation');
    });

    it('provides conditional midday ventilation advice for Poor and Very Poor conditions', () => {
      const plan = generateDailyPlan(mockPoorAqData, defaultPreferences);
      const afternoonVent = plan.afternoon.find(r => r.category === 'ventilation');
      expect(afternoonVent).toBeDefined();
      expect(afternoonVent?.action.toLowerCase()).toContain('12:00 pm and 4:00 pm');
      expect(afternoonVent?.action.toLowerCase()).toContain('conditional');
    });

    it('does NOT instruct bedroom draft-sealing overnight in Good AQI', () => {
      const plan = generateDailyPlan(mockGoodAqData, defaultPreferences);
      const sleepRec = plan.night.find(r => r.id.includes('rec-n-sleep'));
      expect(sleepRec).toBeDefined();
      expect(sleepRec?.action.toLowerCase()).toContain('comfortable bedroom ventilation');
      expect(sleepRec?.reason.toLowerCase()).not.toContain('inversion');
    });
  });

  describe('Phase 3: Vulnerable Household Personalization', () => {
    const sensitivePrefs: UserPreferences = {
      ...defaultPreferences,
      sensitivity: {
        hasChildren: true,
        hasElderly: true,
        hasSensitiveMembers: true,
      },
    };

    it('activates family protection guidance in Moderate AQI', () => {
      const plan = generateDailyPlan(mockModerateAqData, sensitivePrefs);
      const allRecs = [...plan.morning, ...plan.afternoon, ...plan.evening, ...plan.night];
      const sensitiveRec = allRecs.find(r => r.id.includes('vuln'));
      expect(sensitiveRec).toBeDefined();
      expect(sensitiveRec?.action.toLowerCase()).toContain('reduce prolonged or strenuous');
      expect(sensitiveRec?.priority).toBe('medium');
    });

    it('activates high-priority guidance for children and seniors in Poor AQI', () => {
      const plan = generateDailyPlan(mockPoorAqData, sensitivePrefs);
      const allRecs = [...plan.morning, ...plan.afternoon, ...plan.evening, ...plan.night];
      const sensitiveRec = allRecs.find(r => r.id.includes('vuln'));
      expect(sensitiveRec).toBeDefined();
      expect(sensitiveRec?.priority).toBe('high');
      expect(sensitiveRec?.action.toLowerCase()).toContain('restrict prolonged outdoor activities');
    });

    it('activates critical emergency protection for vulnerable members in Severe AQI', () => {
      const plan = generateDailyPlan(mockSevereAqData, sensitivePrefs);
      const allRecs = [...plan.morning, ...plan.afternoon, ...plan.evening, ...plan.night];
      const sensitiveRec = allRecs.find(r => r.id.includes('vuln'));
      expect(sensitiveRec).toBeDefined();
      expect(sensitiveRec?.priority).toBe('critical');
      expect(sensitiveRec?.action.toLowerCase()).toContain('strictly avoid all outdoor exposure');
    });

    it('provides reassuring non-alarmist advice for sensitive members in Good and Satisfactory AQI', () => {
      const planGood = generateDailyPlan(mockGoodAqData, sensitivePrefs);
      const allRecs = [...planGood.morning, ...planGood.afternoon, ...planGood.evening, ...planGood.night];
      const sensitiveRec = allRecs.find(r => r.id.includes('vuln'));
      expect(sensitiveRec).toBeDefined();
      expect(sensitiveRec?.priority).toBe('low');
      expect(sensitiveRec?.action.toLowerCase()).toContain('enjoy outdoor activities freely');
    });
  });

  describe('Phase 4: Commute and Exercise Personalization', () => {
    it('generates context-specific guidance for Metro commuters', () => {
      const metroPrefs: UserPreferences = {
        ...defaultPreferences,
        lifestyle: { ...defaultPreferences.lifestyle, commuteMode: 'metro' },
      };
      const planPoor = generateDailyPlan(mockPoorAqData, metroPrefs);
      const commuteRec = planPoor.morning.find(r => r.category === 'commute');
      expect(commuteRec).toBeDefined();
      expect(commuteRec?.action.toLowerCase()).toContain('metro');
      expect(commuteRec?.action.toLowerCase()).toContain('walking to stations');
    });

    it('generates context-specific guidance for Public Bus commuters', () => {
      const busPrefs: UserPreferences = {
        ...defaultPreferences,
        lifestyle: { ...defaultPreferences.lifestyle, commuteMode: 'bus' },
      };
      const planPoor = generateDailyPlan(mockPoorAqData, busPrefs);
      const commuteRec = planPoor.morning.find(r => r.category === 'commute');
      expect(commuteRec).toBeDefined();
      expect(commuteRec?.action.toLowerCase()).toContain('bus');
      expect(commuteRec?.action.toLowerCase()).toContain('n95');
    });

    it('generates context-specific guidance for Work From Home users', () => {
      const wfhPrefs: UserPreferences = {
        ...defaultPreferences,
        lifestyle: { ...defaultPreferences.lifestyle, commuteMode: 'work_from_home' },
      };
      const planPoor = generateDailyPlan(mockPoorAqData, wfhPrefs);
      const commuteRec = planPoor.morning.find(r => r.category === 'commute');
      expect(commuteRec).toBeDefined();
      expect(commuteRec?.action.toLowerCase()).toContain('working from home');
      expect(commuteRec?.action.toLowerCase()).toContain('eliminates commute');

      // WFH should NOT receive evening rush-hour commute warnings
      const eveningCommute = planPoor.evening.find(r => r.category === 'commute');
      expect(eveningCommute).toBeUndefined();
    });

    it('does NOT tell users with indoor exercise location to "relocate indoors"', () => {
      const indoorExercisePrefs: UserPreferences = {
        ...defaultPreferences,
        lifestyle: {
          ...defaultPreferences.lifestyle,
          exerciseType: 'yoga',
          exerciseLocation: 'indoor',
        },
      };
      const planSevere = generateDailyPlan(mockSevereAqData, indoorExercisePrefs);
      const allRecs = [...planSevere.morning, ...planSevere.afternoon, ...planSevere.evening, ...planSevere.night];
      const exerciseRec = allRecs.find(r => r.category === 'exercise');
      expect(exerciseRec).toBeDefined();
      expect(exerciseRec?.action.toLowerCase()).not.toContain('relocate workout indoors');
      expect(exerciseRec?.action.toLowerCase()).not.toContain('switch to gentle indoor');
      expect(exerciseRec?.action.toLowerCase()).toContain('maintain indoor workout');
    });

    it('places exercise card in the user-specified exerciseTime slot', () => {
      const eveningExercisePrefs: UserPreferences = {
        ...defaultPreferences,
        lifestyle: {
          ...defaultPreferences.lifestyle,
          exerciseType: 'running',
          exerciseLocation: 'outdoor',
          exerciseTime: 'evening' as TimeOfDay,
        },
      };
      const plan = generateDailyPlan(mockGoodAqData, eveningExercisePrefs);
      const eveningExercise = plan.evening.find(r => r.category === 'exercise');
      expect(eveningExercise).toBeDefined();
      expect(eveningExercise?.timeOfDay).toBe('evening');

      const morningExercise = plan.morning.find(r => r.category === 'exercise');
      expect(morningExercise).toBeUndefined();
    });
  });

  describe('Phase 5: Sustainable Alternatives & Invariants', () => {
    it('prioritizes respiratory health over emission reduction during high pollution', () => {
      const alternatives = generateSustainableAlternatives(mockSevereAqData, defaultPreferences);
      const commuteAlt = alternatives.find(a => a.id.includes('commute'));
      expect(commuteAlt).toBeDefined();
      expect(commuteAlt?.safetyNote).toContain('CRITICAL');
      expect(commuteAlt?.safetyNote).toContain('Do NOT switch to cycling');
    });

    it('strictly separates exposureImpact from emissionImpact across all alternatives', () => {
      const alternatives = generateSustainableAlternatives(mockSevereAqData, defaultPreferences);
      for (const alt of alternatives) {
        expect(alt.exposureImpact).toBeDefined();
        expect(alt.emissionImpact).toBeDefined();
        expect(alt.exposureImpact.length).toBeGreaterThan(10);
        expect(alt.emissionImpact.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Phase 6: Recommendation ID Generation & Uniqueness Invariants', () => {
    it('generates unique IDs across repeated calls within one generator instance', () => {
      const createId = makeIdGenerator();
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(createId('rec-test'));
      }
      expect(ids.size).toBe(50);
    });

    it('generates unique IDs across separate generator instances created in the same tick', () => {
      const gen1 = makeIdGenerator();
      const gen2 = makeIdGenerator();
      const id1 = gen1('rec-test');
      const id2 = gen2('rec-test');
      expect(id1).not.toBe(id2);
    });

    it('preserves prefix and expected structure in generated IDs', () => {
      const createId = makeIdGenerator();
      const id = createId('rec-custom');
      expect(id.startsWith('rec-custom-')).toBe(true);
      const parts = id.split('-');
      // Format: prefix... - timestamp - seed - counter
      expect(parts.length).toBeGreaterThanOrEqual(4);
    });

    it('ensures separate calls to generateDailyPlan in the same millisecond produce distinct recommendation IDs', () => {
      const plan1 = generateDailyPlan(mockGoodAqData, defaultPreferences);
      const plan2 = generateDailyPlan(mockGoodAqData, defaultPreferences);

      const plan1Ids = new Set(
        [...plan1.morning, ...plan1.afternoon, ...plan1.evening, ...plan1.night].map(r => r.id)
      );
      const plan2Recs = [...plan2.morning, ...plan2.afternoon, ...plan2.evening, ...plan2.night];

      // Verify all IDs within plan1 are unique
      const totalRecs = plan1.morning.length + plan1.afternoon.length + plan1.evening.length + plan1.night.length;
      expect(plan1Ids.size).toBe(totalRecs);

      // Verify no ID collision between plan1 and plan2
      for (const rec of plan2Recs) {
        expect(plan1Ids.has(rec.id)).toBe(false);
      }
    });
  });
});
