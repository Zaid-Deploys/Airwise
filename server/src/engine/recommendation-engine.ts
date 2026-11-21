/**
 * AIRWISE — Deterministic Recommendation Engine
 * 
 * Generates personalized, evidence-informed recommendations based on:
 * 1. Current CPCB AQI and individual pollutant concentrations
 * 2. User schedule (wake, sleep, work)
 * 3. User lifestyle (commute mode, exercise type, location, timing, outdoor habits)
 * 4. Household setup (ventilation, purifier, cooking fuel, exhaust)
 * 5. Sensitive members (children, elderly, respiratory issues)
 * 
 * Core Safety Principles:
 * - Exposure reduction ALWAYS trumps emission reduction in high pollution.
 * - Strenuous outdoor exercise is strictly prohibited in Poor, Very Poor, and Severe AQI.
 * - Non-existent appliances (e.g. exhaust fans) are never instructed to be operated.
 * - Context-sensitive priority calibration: reserve 'critical' for genuinely urgent health protections.
 * - Transparent trade-offs, evidence citations, and no fabricated clinical claims.
 */

import type {
  AirQualityData,
  UserPreferences,
  DailyActionPlan,
  Recommendation,
  IndoorRecommendation,
  SustainableAlternative,
  RoomType,
  TimeOfDay,
} from '../types/index.js';

let recCounter = 0;
function createId(prefix: string): string {
  recCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${recCounter}`;
}

/**
 * Generate a complete, personalized Daily Action Plan
 */
export function generateDailyPlan(
  aqData: AirQualityData,
  preferences: UserPreferences
): DailyActionPlan {
  const { aqi, category } = aqData;
  const isSevere = category === 'Severe';
  const isVeryPoor = category === 'Very Poor';
  const isSevereOrVeryPoor = isSevere || isVeryPoor;
  const isPoor = category === 'Poor';
  const isPoorOrWorse = isSevereOrVeryPoor || isPoor;
  const isModerate = category === 'Moderate';
  const isModerateOrWorse = isPoorOrWorse || isModerate;
  const isSatisfactory = category === 'Satisfactory';
  const isGood = category === 'Good';

  const morning: Recommendation[] = [];
  const afternoon: Recommendation[] = [];
  const evening: Recommendation[] = [];
  const night: Recommendation[] = [];

  const addToSlot = (time: TimeOfDay, rec: Recommendation) => {
    rec.timeOfDay = time;
    if (time === 'morning') morning.push(rec);
    else if (time === 'afternoon') afternoon.push(rec);
    else if (time === 'evening') evening.push(rec);
    else night.push(rec);
  };

  const hasChildren = Boolean(preferences.sensitivity?.hasChildren);
  const hasElderly = Boolean(preferences.sensitivity?.hasElderly);
  const hasSensitiveMembers = Boolean(preferences.sensitivity?.hasSensitiveMembers);
  const hasAnySensitive = hasChildren || hasElderly || hasSensitiveMembers;

  // ----------------------------------------------------
  // 1. EXERCISE RECOMMENDATIONS (Placed by exerciseTime preference)
  // ----------------------------------------------------
  if (preferences.lifestyle.exerciseType !== 'none') {
    const exerciseSlot: TimeOfDay = preferences.lifestyle.exerciseTime || 'morning';
    const isIndoorExercise = preferences.lifestyle.exerciseLocation === 'indoor';

    if (isIndoorExercise) {
      // User ALREADY exercises indoors - do NOT tell them to "relocate indoors"
      if (isSevereOrVeryPoor) {
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: 'Maintain indoor workout routine; keep workout intensity moderate and ensure exercise space is sheltered',
          reason: `Ambient AQI is ${category} (${aqi}). Exercising indoors protects lungs from hazardous surface air pollution while maintaining daily fitness.`,
          context: `Scheduled indoor ${preferences.lifestyle.exerciseType} routine.`,
          expectedBenefit: 'Avoids heavy inhalation of fine particulate matter (PM2.5) that occurs during elevated respiration rates outdoors.',
          limitation: 'Keep windows closed in the exercise area. If an air purifier is available, operate it in the room during your workout.',
          source: 'WHO Global Air Quality Guidelines (2021); CPCB Health Advisory',
          priority: isSevere ? 'high' : 'medium',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'exposure_reduction',
          isCompleted: false,
        });
      } else if (isPoor) {
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: 'Proceed with indoor workout as scheduled; keep external windows closed in the exercise area',
          reason: `Outdoor air is Poor (${aqi}). Indoor exercise avoids direct exposure to ground-level vehicle exhaust and ambient particulate spikes.`,
          context: `Indoor ${preferences.lifestyle.exerciseType} routine.`,
          expectedBenefit: 'Maintains daily cardiovascular routine without outdoor pollutant intake.',
          limitation: 'Rely on internal ceiling fan or indoor air circulation without drawing in unconditioned outside air.',
          source: 'CPCB NAQI Guidelines',
          priority: 'medium',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'exposure_reduction',
          isCompleted: false,
        });
      } else {
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: `Proceed with scheduled indoor ${preferences.lifestyle.exerciseType} workout`,
          reason: `Ambient air is ${category} (AQI: ${aqi}). Indoor physical activity supports daily cardiovascular fitness in controlled conditions.`,
          context: `Indoor ${preferences.lifestyle.exerciseType} session.`,
          expectedBenefit: 'Cardiovascular and physical fitness with controlled indoor air conditions.',
          limitation: 'None under current atmospheric conditions.',
          source: 'CPCB National Air Quality Index Guidelines',
          priority: 'low',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'health_benefit',
          isCompleted: false,
        });
      }
    } else {
      // Outdoor exercise (or both)
      if (isSevereOrVeryPoor) {
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: 'Switch to gentle indoor workout (yoga, stretching, or light calisthenics)',
          reason: `Ambient AQI is ${category} (${aqi}). Strenuous outdoor cardiovascular breathing multiplies deep lung deposition of fine toxic particulates (PM2.5).`,
          context: `Scheduled outdoor ${preferences.lifestyle.exerciseType} routine during high pollution.`,
          expectedBenefit: 'Drastically cuts inhaled PM2.5 dosage compared to outdoor cardiovascular cardio.',
          limitation: 'Outdoor workouts should be completely avoided until air dispersion improves.',
          source: 'WHO Global Air Quality Guidelines (2021); CPCB Health Advisory',
          priority: 'critical',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'exposure_reduction',
          isCompleted: false,
        });
      } else if (isPoor) {
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: 'Relocate workout indoors or postpone until midday when atmospheric dispersion improves',
          reason: `Ambient air is Poor (${aqi}). Temperature inversions trap ground-level particulate matter in early morning and late evening.`,
          context: `Scheduled outdoor exercise: ${preferences.lifestyle.exerciseType}.`,
          expectedBenefit: 'Avoids peak particulate exposure during stagnant inversion hours.',
          limitation: 'Requires adequate clean indoor workout space.',
          source: 'Central Pollution Control Board (CPCB) NAQI Guidelines',
          priority: 'high',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'exposure_reduction',
          isCompleted: false,
        });
      } else if (isModerate) {
        if (hasAnySensitive) {
          addToSlot(exerciseSlot, {
            id: createId('rec-ex'),
            action: 'Limit intense outdoor exertion for sensitive members; consider indoor exercise alternatives',
            reason: `Moderate AQI (${aqi}) can trigger airway irritation in sensitive respiratory tracts during vigorous exertion.`,
            context: 'Household with sensitive or vulnerable members.',
            expectedBenefit: 'Reduces risk of acute coughing, wheezing, and bronchial irritation.',
            limitation: 'Healthy adults can engage in outdoor exercise but should avoid high-traffic corridors.',
            source: 'Ministry of Health & Family Welfare (MoHFW) Health Advisory',
            priority: 'medium',
            category: 'exercise',
            timeOfDay: exerciseSlot,
            impactType: 'exposure_reduction',
            isCompleted: false,
          });
        } else {
          addToSlot(exerciseSlot, {
            id: createId('rec-ex'),
            action: 'Proceed with outdoor workout, prioritizing parks and tree-lined corridors away from arterial traffic',
            reason: `AQI is Moderate (${aqi}). Tree canopies filter a fraction of coarse dust and distance you from immediate tailpipe emissions.`,
            context: `Outdoor ${preferences.lifestyle.exerciseType} routine.`,
            expectedBenefit: 'Balances cardiovascular fitness gains against acceptable exposure levels.',
            limitation: 'Avoid busy roads where localized nitrogen dioxide (NO2) and vehicle soot spike.',
            source: 'CPCB Guidelines',
            priority: 'low',
            category: 'exercise',
            timeOfDay: exerciseSlot,
            impactType: 'health_benefit',
            isCompleted: false,
          });
        }
      } else {
        // Good or Satisfactory
        addToSlot(exerciseSlot, {
          id: createId('rec-ex'),
          action: 'Enjoy normal outdoor exercise and activities freely',
          reason: `Air quality is ${category} (AQI: ${aqi}). Excellent atmospheric conditions for outdoor physical fitness.`,
          context: `Daily ${preferences.lifestyle.exerciseType} session.`,
          expectedBenefit: 'Full cardiovascular and psychological benefits with minimal pollutant exposure.',
          limitation: 'None under current ambient conditions.',
          source: 'CPCB National Air Quality Index',
          priority: 'low',
          category: 'exercise',
          timeOfDay: exerciseSlot,
          impactType: 'health_benefit',
          isCompleted: false,
        });
      }
    }
  }

  // ----------------------------------------------------
  // 2. MORNING COMMUTE RECOMMENDATIONS (All 8 modes supported)
  // ----------------------------------------------------
  const commute = preferences.lifestyle.commuteMode;

  if (commute === 'bicycle' || commute === 'walk') {
    if (isSevereOrVeryPoor) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'If active commute is unavoidable, use a well-fitted particulate respirator (such as N95/FFP2) or switch to closed transit',
        reason: `Active commuting in AQI ${aqi} (${category}) increases breathing rate, which can increase particulate inhalation along traffic corridors.`,
        context: `Commute mode: ${commute}. Active commute during high ambient pollution.`,
        expectedBenefit: 'Particulate respirators help reduce inhalation of airborne particles when an effective face seal is maintained.',
        limitation: 'Cloth or standard surgical masks provide minimal particulate filtration. Respirators increase breathing resistance during exertion and do not substitute for avoiding high-pollution exposure.',
        source: 'MoHFW Health Advisory on Air Pollution (November 2025)',
        priority: 'critical',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isPoor) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Wear a well-fitted certified N95 mask or choose closed public transport during morning inversion hours',
        reason: `Ambient air is Poor (${aqi}). Active commuting on roadways exposes pedestrians and cyclists to concentrated vehicle exhaust.`,
        context: `Active commute: ${commute}.`,
        expectedBenefit: 'Significantly reduces inhalation of fine particulate matter (PM2.5) and diesel soot.',
        limitation: 'Ensure mask fits snugly over the bridge of the nose and chin.',
        source: 'CPCB NAQI Advisory',
        priority: 'high',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-com'),
        action: `Proceed with active commute (${commute}) via low-traffic secondary streets; wear a mask if sensitive`,
        reason: `AQI is Moderate (${aqi}). Choosing secondary streets keeps you away from arterial vehicle exhaust plumes.`,
        context: `Commute: ${commute}.`,
        expectedBenefit: 'Reduces roadside nitrogen dioxide and particulate inhalation.',
        limitation: 'Secondary routes may slightly increase travel distance.',
        source: 'Clean Air Asia Sustainable Urban Mobility Guide',
        priority: 'medium',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'both',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: `Proceed with active commute (${commute}) via low-traffic secondary streets`,
        reason: `AQI is ${category} (${aqi}). Atmospheric conditions are clean and favorable for active walking or cycling.`,
        context: `Green commute: ${commute}.`,
        expectedBenefit: 'Zero tailpipe emissions and personal fitness benefit in clean air.',
        limitation: 'None under current ambient conditions.',
        source: 'Clean Air Asia Sustainable Urban Mobility Guide',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'both',
        isCompleted: false,
      });
    }
  } else if (commute === 'motorcycle' || commute === 'auto_rickshaw') {
    if (isSevereOrVeryPoor) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'If open transit is unavoidable, wear a properly fitted particulate respirator (such as N95) per manufacturer instructions',
        reason: `Open motorized transit exposes riders directly to traffic exhaust and elevated ambient particulate matter (${category}, AQI: ${aqi}).`,
        context: `Transit mode: ${commute} (${preferences.lifestyle.commuteDurationMinutes ?? 30} mins typical duration).`,
        expectedBenefit: 'A properly fitted particulate respirator helps reduce inhalation of airborne particulate matter during unavoidable travel.',
        limitation: 'A continuous perimeter seal per manufacturer instructions is required; respirators do not filter toxic exhaust gases and are not a guarantee of protection or a substitute for avoiding exposure.',
        source: 'MoHFW Health Advisory on Air Pollution (November 2025)',
        priority: 'critical',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isPoor) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Consider a properly fitted particulate respirator (such as N95) if open transit is necessary',
        reason: `Ambient air is Poor (${category}, AQI: ${aqi}). Open vehicle riders experience direct exposure to roadway traffic emissions.`,
        context: `Transit mode: ${commute}.`,
        expectedBenefit: 'Helps reduce inhaled particulate matter when fitted according to manufacturer instructions.',
        limitation: 'Respirators reduce particulate exposure but do not filter exhaust gases, guarantee complete protection, or replace avoiding unnecessary travel.',
        source: 'MoHFW Health Advisory on Air Pollution (November 2025)',
        priority: 'high',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Consider wearing a particulate mask during open transit along congested traffic corridors if sensitive',
        reason: `Moderate AQI (${aqi}) combined with localized vehicle exhaust can cause airway irritation in sensitive individuals.`,
        context: `Transit mode: ${commute}.`,
        expectedBenefit: 'Provides a barrier against localized road dust and coarse vehicle emissions.',
        limitation: 'Ensure mask is comfortable and does not impede helmet fit, strap closure, or peripheral vision.',
        source: 'CPCB NAQI Guidelines',
        priority: 'medium',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: `Open transit (${commute}) is safe in current ambient air`,
        reason: `Air quality is ${category} (AQI: ${aqi}). Minimal particulate exposure risk during outdoor transit.`,
        context: `Transit mode: ${commute}.`,
        expectedBenefit: 'Normal travel without specific respiratory protection required.',
        limitation: 'Standard road safety precautions apply.',
        source: 'CPCB National Air Quality Index',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  } else if (commute === 'car') {
    if (isPoorOrWorse) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Set car climate control to Cabin Recirculation mode and ensure cabin filter is clean',
        reason: `Setting HVAC to internal recirculation prevents drawing polluted outside air (${category}, AQI: ${aqi}) into the enclosed vehicle cabin during traffic crawl.`,
        context: `Car commute during high pollution.`,
        expectedBenefit: 'Reduces in-cabin PM2.5 concentrations compared to outside traffic levels.',
        limitation: 'Extended recirculation with multiple passengers elevates CO2; crack windows briefly in clean, moving sections if drowsiness occurs.',
        source: 'Society of Automotive Engineers (SAE) In-Cabin Air Quality Study',
        priority: 'high',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Use Cabin Recirculation mode in congested traffic bottlenecks',
        reason: `Moderate AQI (${aqi}). Recirculation shields cabin occupants from localized stop-and-go diesel plumes.`,
        context: `Car commute in moderate air.`,
        expectedBenefit: 'Prevents direct intrusion of tailpipe exhaust into passenger compartment.',
        limitation: 'Switch back to fresh air intake periodically when driving at speed in open corridors.',
        source: 'SAE In-Cabin Air Quality Study',
        priority: 'medium',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Normal vehicle transit; fresh air intake is acceptable in clean ambient air',
        reason: `Air quality is ${category} (AQI: ${aqi}). Outside air is clean for cabin ventilation.`,
        context: `Car commute.`,
        expectedBenefit: 'Provides fresh cabin air without elevated particulate risk.',
        limitation: 'None under current atmospheric conditions.',
        source: 'CPCB National Air Quality Index',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  } else if (commute === 'metro') {
    if (isPoorOrWorse) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Metro transit: wear a certified N95 mask while walking to stations and waiting on open-air elevated platforms',
        reason: `Metro trains bypass road traffic, but walking segments and outdoor elevated platforms are exposed to ambient smog (${category}, AQI: ${aqi}).`,
        context: 'Metro rail commuter routine during high pollution.',
        expectedBenefit: 'Protects respiratory tract during walking and platform waiting periods.',
        limitation: 'Do not assume train coaches have medical-grade filtration unless closed, filtered HVAC is actively operating.',
        source: 'CPCB Urban Transit Health Advisory',
        priority: 'high',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Metro transit avoids road congestion; consider a mask on outdoor platforms if sensitive',
        reason: `Moderate AQI (${aqi}). Metro rail avoids street-level tailpipe exhaust plumes.`,
        context: 'Metro commute in moderate air.',
        expectedBenefit: 'Lower direct exhaust exposure compared to surface road transit.',
        limitation: 'Be mindful of crowded station concourses.',
        source: 'Clean Air Asia Sustainable Urban Mobility Guide',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'both',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Metro transit provides efficient, low-emission urban mobility in clean air conditions',
        reason: `Air quality is ${category} (AQI: ${aqi}). Rail transit has minimal personal exposure and low environmental footprint.`,
        context: 'Metro commute in clean ambient air.',
        expectedBenefit: 'Low personal emission footprint and smooth transit.',
        limitation: 'None.',
        source: 'Clean Air Asia Mobility Guide',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'both',
        isCompleted: false,
      });
    }
  } else if (commute === 'bus') {
    if (isPoorOrWorse) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Wear a certified N95 mask at roadside bus shelters and prefer closed AC buses where available',
        reason: `Roadside waiting areas and open-window buses expose passengers to localized vehicle exhaust plumes and tire dust during high pollution (${category}).`,
        context: 'Public bus transit routine in elevated ambient pollution.',
        expectedBenefit: 'Filters roadside diesel soot and fine particulate matter.',
        limitation: 'Non-AC buses with open windows provide minimal barrier against ambient outdoor smog.',
        source: 'MoHFW Health Advisory on Air Pollution (November 2025)',
        priority: 'high',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Bus transit: stand away from idling vehicle exhaust pipes while waiting at bus stops',
        reason: `Moderate AQI (${aqi}). Immediate proximity to idling diesel bus exhausts can cause acute throat irritation.`,
        context: 'Public bus commute.',
        expectedBenefit: 'Avoids breathing direct micro-plumes of diesel exhaust.',
        limitation: 'Requires positioning toward the cleaner end of transit shelters.',
        source: 'CPCB Guidelines',
        priority: 'medium',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Public bus commute offers efficient group transit in current favorable air conditions',
        reason: `Air quality is ${category} (AQI: ${aqi}). Group transit lowers per-capita emissions in clean ambient air.`,
        context: 'Bus commute in clean air.',
        expectedBenefit: 'Sustainable travel with minimal exposure risk.',
        limitation: 'None under current atmospheric conditions.',
        source: 'Clean Air Asia Sustainable Urban Mobility Guide',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'both',
        isCompleted: false,
      });
    }
  } else if (commute === 'work_from_home') {
    if (isPoorOrWorse) {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Working from home eliminates commute exposure; keep home workspace sealed and filtered',
        reason: `Eliminating outdoor morning travel during ${category} AQI (${aqi}) avoids exposure to peak traffic exhaust and morning surface inversion spikes.`,
        context: 'Work from home routine during high pollution.',
        expectedBenefit: 'Zero transit particulate intake; protects lungs during the daily peak pollution window.',
        limitation: 'Maintain indoor workspace cleanliness and avoid indoor combustion sources.',
        source: 'MoHFW Air Pollution Advisory; CPCB Guidelines',
        priority: 'medium',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      morning.push({
        id: createId('rec-m-com'),
        action: 'Work from home routine: take short active breaks; open windows for natural air exchange in clean air',
        reason: `Air quality is ${category} (AQI: ${aqi}). Clean outdoor air allows refreshing your home workspace naturally.`,
        context: 'Work from home setup.',
        expectedBenefit: 'Prevents indoor CO2 accumulation and promotes physical mobility during the workday.',
        limitation: 'None.',
        source: 'CPCB Guidelines',
        priority: 'low',
        category: 'commute',
        timeOfDay: 'morning',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  }

  // ----------------------------------------------------
  // 3. MORNING VENTILATION RECOMMENDATIONS
  // ----------------------------------------------------
  if (isSevere) {
    morning.push({
      id: createId('rec-m-vent'),
      action: 'Keep exterior windows and balcony doors strictly sealed during morning hours',
      reason: `Severe AQI (${aqi}). Morning temperature inversion traps hazardous particulate matter near ground level between 6:00 AM and 10:00 AM.`,
      context: `Home ventilation setup: ${preferences.home.ventilationType}.`,
      expectedBenefit: 'Maintains an indoor particulate buffer, preventing dense outdoor smog from penetrating living spaces.',
      limitation: 'May increase indoor stuffiness; rely on indoor air circulation fans rather than opening exterior windows.',
      source: 'MoHFW Health Advisory (Nov 2025); CPCB Guidelines',
      priority: 'critical',
      category: 'ventilation',
      timeOfDay: 'morning',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else if (isVeryPoor || isPoor) {
    morning.push({
      id: createId('rec-m-vent'),
      action: 'Keep exterior windows and balcony doors closed during early morning hours',
      reason: `Morning temperature inversion traps ground-level pollution between 6:00 AM and 10:00 AM in ${category} air (${aqi}).`,
      context: `Home ventilation setup: ${preferences.home.ventilationType}.`,
      expectedBenefit: 'Maintains indoor air cleanliness and blocks peak morning traffic soot infiltration.',
      limitation: 'Rely on internal air movement; ventilate conditionally only during afternoon dispersion if necessary.',
      source: 'CPCB & Central Building Research Institute (CBRI) Indoor Guidelines',
      priority: 'high',
      category: 'ventilation',
      timeOfDay: 'morning',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else if (isModerate) {
    morning.push({
      id: createId('rec-m-vent'),
      action: 'Brief morning ventilation is acceptable; close street-facing windows during peak rush hour',
      reason: `Moderate AQI (${aqi}). Morning air can refresh the home, but immediate traffic plumes should be avoided.`,
      context: 'Daily home air exchange.',
      expectedBenefit: 'Flushes overnight CO2 while minimizing vehicle exhaust intrusion.',
      limitation: 'Close windows if neighborhood dust or localized burning is observed.',
      source: 'CPCB Guidelines',
      priority: 'low',
      category: 'ventilation',
      timeOfDay: 'morning',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  } else {
    morning.push({
      id: createId('rec-m-vent'),
      action: 'Open cross-ventilation windows for 20–30 minutes to flush stale indoor air and reduce CO2',
      reason: `Outdoor air is ${category} (AQI: ${aqi}). Atmospheric conditions are clean and favorable for thorough natural ventilation.`,
      context: 'Daily home air exchange.',
      expectedBenefit: 'Expels indoor volatile organic compounds (VOCs) and accumulated night-time CO2 safely.',
      limitation: 'Close windows if direct construction dust or garden burning occurs nearby.',
      source: 'ASHRAE Standard 62.1; CPCB National Air Quality Index',
      priority: 'low',
      category: 'ventilation',
      timeOfDay: 'morning',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  }

  // ----------------------------------------------------
  // 4. VULNERABLE HOUSEHOLD PERSONALIZATION (All 6 tiers)
  // ----------------------------------------------------
  if (hasAnySensitive) {
    const vulnerableLabels: string[] = [];
    if (hasChildren) vulnerableLabels.push('children');
    if (hasElderly) vulnerableLabels.push('elderly members');
    if (hasSensitiveMembers) vulnerableLabels.push('sensitive members');
    const groupName = vulnerableLabels.join(', ');

    if (isSevere) {
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Emergency protection: strictly avoid all outdoor exposure for ${groupName}`,
        reason: `Severe AQI (${aqi}) is an emergency health hazard. Fine particulate matter penetrates deep into sensitive lungs and systemic circulation, significantly worsening symptoms.`,
        context: `Household with ${groupName} in Severe smog.`,
        expectedBenefit: 'Shields vulnerable cardiovascular and respiratory systems from dangerous pollutant surges.',
        limitation: 'Establish an indoor clean room with air filtration; avoid any indoor smoke. Family members with clinician-prescribed respiratory management plans should keep prescribed medications accessible per doctor instructions.',
        source: 'MoHFW Health Advisory (Nov 2025); CPCB Emergency Advisory',
        priority: 'critical',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isVeryPoor) {
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Keep ${groupName} indoors and maintain low physical activity levels`,
        reason: `Very Poor air quality (${aqi}) triggers respiratory discomfort and cardiovascular stress on prolonged exposure in vulnerable groups.`,
        context: `Household with ${groupName}.`,
        expectedBenefit: 'Lowers acute respiratory inflammation and prevents exposure spikes.',
        limitation: 'Keep indoor living areas filtered and closed. Consult a healthcare provider if coughing, wheezing, or chest tightness develops. Note: standard adult N95 respirators do not fit young children properly without pediatric fit evaluation.',
        source: 'MoHFW Health Advisory (Nov 2025); CPCB Health Advisory',
        priority: 'critical',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isPoor) {
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Restrict prolonged outdoor activities and playground exertion for ${groupName}`,
        reason: `Poor air quality (${aqi}) causes breathing discomfort on prolonged exposure. Children breathe more air per kilogram of body weight, and seniors have reduced respiratory reserve.`,
        context: `Household with ${groupName}.`,
        expectedBenefit: 'Avoids heavy particulate deposition in sensitive airways during daily pollution peaks.',
        limitation: 'Organize indoor play and gentle activities. Ensure clinician-prescribed inhalers or medicines are kept accessible as directed by your physician.',
        source: 'MoHFW Health Advisory (Nov 2025); CPCB Health Advisory',
        priority: 'high',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Reduce prolonged or strenuous outdoor exertion for ${groupName}`,
        reason: `Moderate AQI (${aqi}) may cause breathing discomfort to people with lung/heart conditions, children, and seniors during extended physical exertion.`,
        context: `Household with ${groupName}.`,
        expectedBenefit: 'Prevents acute airway irritation while allowing normal routine activities.',
        limitation: 'Take frequent resting breaks during outdoor tasks; avoid high-traffic corridors.',
        source: 'CPCB NAQI Guidelines; MoHFW Advisory',
        priority: 'medium',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isSatisfactory) {
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Satisfactory air: ${groupName} can participate in outdoor activities, monitoring for symptoms`,
        reason: `AQI is Satisfactory (${aqi}). Unusually sensitive individuals with preexisting respiratory conditions should observe symptoms during prolonged strenuous exertion.`,
        context: `Household with ${groupName}.`,
        expectedBenefit: 'Supports normal outdoor play, schooling, and walks without unnecessary alarm.',
        limitation: 'Sensitive individuals should pace themselves during heavy sports.',
        source: 'CPCB National Air Quality Index Health Advisory',
        priority: 'low',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    } else if (isGood) {
      // Good
      morning.push({
        id: createId('rec-m-vuln'),
        action: `Clean air conditions: ${groupName} can enjoy outdoor activities freely`,
        reason: `Air quality is Good (${aqi}). Atmospheric conditions pose minimal impact to health for all age groups.`,
        context: `Household with ${groupName}.`,
        expectedBenefit: 'Full physical, developmental, and psychological benefits of outdoor play and fresh air.',
        limitation: 'None under current clean conditions.',
        source: 'CPCB National Air Quality Index',
        priority: 'low',
        category: 'children',
        timeOfDay: 'morning',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  }

  // ----------------------------------------------------
  // 5. AFTERNOON COOKING (Source control & realistic ventilation)
  // ----------------------------------------------------
  const cookingFuel = preferences.home.cookingFuel || 'gas';
  const hasExhaust = preferences.home.hasExhaust;

  if (cookingFuel === 'electric' || cookingFuel === 'induction') {
    afternoon.push({
      id: createId('rec-a-cook'),
      action: 'Clean electric/induction cooking: use lids on cookware to contain cooking aerosols and moisture',
      reason: 'Electric and induction cooktops produce zero combustion gases (NO2 and CO), maintaining clean baseline kitchen air.',
      context: `Cooking setup: ${cookingFuel} cooktop.`,
      expectedBenefit: 'Eliminates household fossil fuel combustion products and reduces indoor humidity.',
      limitation: 'High-heat oil frying can still aerosolize fine oil droplets; cover pans during searing.',
      source: 'WHO Household Air Quality Guidelines; BEE Clean Cooking Guide',
      priority: 'low',
      category: 'cooking',
      timeOfDay: 'afternoon',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  } else if (cookingFuel === 'gas') {
    if (hasExhaust) {
      afternoon.push({
        id: createId('rec-a-cook'),
        action: 'Operate kitchen exhaust fan on high throughout cooking and for 5–10 minutes afterwards',
        reason: 'LPG burners and high-heat frying emit nitrogen dioxide (NO2), carbon monoxide (CO), and fine aerosol droplets.',
        context: 'Cooking setup: gas stove with outdoor exhaust fan.',
        expectedBenefit: 'Evacuates over 70% of combustion by-products directly before they disperse into adjacent bedrooms and living areas.',
        limitation: 'Ensure exhaust ducting vents directly outside rather than recirculating.',
        source: 'WHO Household Air Quality Guidelines; Bureau of Indian Standards (BIS)',
        priority: isSevereOrVeryPoor ? 'high' : 'medium',
        category: 'cooking',
        timeOfDay: 'afternoon',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      // NO EXHAUST FAN! Never instruct user to operate an exhaust fan!
      afternoon.push({
        id: createId('rec-a-cook'),
        action: 'Maximize natural kitchen ventilation, isolate living areas, and use tight lids while cooking on gas burners',
        reason: 'LPG combustion produces nitrogen dioxide (NO2) and fine aerosolized particles. Without an outdoor-venting exhaust fan, combustion emissions accumulate indoors.',
        context: 'Cooking setup: gas stove without an outdoor exhaust fan.',
        expectedBenefit: 'Covers contain oil droplets, and isolating the kitchen door prevents fumes from spreading to bedrooms.',
        limitation: isPoorOrWorse
          ? `Outdoor AQI is ${category} (${aqi}). Keep interior kitchen doors closed to isolate cooking gases; avoid prolonged high-heat frying. Only crack an exterior window if fumes are dense, and close it promptly to block outdoor smog infiltration. Note: portable room HEPA purifiers cannot replace outdoor exhaust and should not be placed near stoves where grease can clog filters.`
          : 'Open an exterior kitchen window while keeping interior doors to living areas closed, allowing combustion gases to vent outdoors. Note: portable room HEPA purifiers cannot substitute for outdoor ventilation.',
        source: 'WHO Household Air Quality Guidelines; BIS Standards',
        priority: 'high',
        category: 'cooking',
        timeOfDay: 'afternoon',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    }
  } else if (cookingFuel === 'wood' || cookingFuel === 'mixed') {
    // Solid fuel
    if (hasExhaust) {
      afternoon.push({
        id: createId('rec-a-cook'),
        action: 'Operate exhaust fan on maximum, keep kitchen isolated from living areas, and plan transition to clean cooking',
        reason: 'Solid biomass combustion produces hazardous concentrations of particulate matter, carbon monoxide, and carcinogens.',
        context: 'Solid biomass/wood cooking with exhaust.',
        expectedBenefit: 'Exhaust captures a portion of heavy smoke at the point of origin.',
        limitation: 'Biomass smoke is hazardous even with exhaust; transition to LPG/induction (e.g. PMUY scheme) is strongly advised.',
        source: 'WHO Household Air Quality Guidelines; PMUY Guidelines',
        priority: 'high',
        category: 'cooking',
        timeOfDay: 'afternoon',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      // Solid fuel WITHOUT exhaust
      afternoon.push({
        id: createId('rec-a-cook'),
        action: 'Isolate cooking space from living quarters, ensure cross-breeze through external openings, and prioritize clean fuel access',
        reason: 'Solid fuel combustion in an unventilated kitchen creates toxic indoor PM2.5 levels that can exceed 1000 μg/m³, posing severe health risks.',
        context: 'Solid fuel cooking without dedicated exhaust.',
        expectedBenefit: 'Isolating the area protects sleeping quarters and children from dense smoke.',
        limitation: 'Acute exposure hazard. Transitioning to clean fuel (LPG under PMUY or electric induction) is the only definitive protection.',
        source: 'WHO Guidelines for Household Fuel Combustion',
        priority: 'critical',
        category: 'cooking',
        timeOfDay: 'afternoon',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    }
  }

  // ----------------------------------------------------
  // 6. AFTERNOON WINDOW VENTILATION (Conditional & Evidence-Based)
  // ----------------------------------------------------
  if (isSevere) {
    afternoon.push({
      id: createId('rec-a-vent'),
      action: 'Maintain sealed indoor environment; avoid outdoor window ventilation during severe smog',
      reason: `Ambient AQI is Severe (${aqi}). Outdoor particulate levels remain hazardous throughout the midday period.`,
      context: 'Government of India Health Advisory (Nov 2025): Keep doors and windows tightly closed during severe pollution episodes.',
      expectedBenefit: 'Maintains indoor clean-air buffer and prevents outdoor toxic particulate matter from inundating living areas.',
      limitation: 'If indoor cooking fumes, moisture, or stuffiness accumulate, briefly crack a window on the side of the home facing away from streets while running an exhaust fan, then reseal promptly.',
      source: 'Ministry of Health and Family Welfare (MoHFW) Health Advisory on Air Pollution (Nov 2025)',
      priority: 'high',
      category: 'ventilation',
      timeOfDay: 'afternoon',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else if (isVeryPoor || isPoor) {
    afternoon.push({
      id: createId('rec-a-vent'),
      action: 'Conditional afternoon ventilation: open windows only between 12:00 PM and 4:00 PM if indoor air requires refreshing',
      reason: 'Solar heating elevates the atmospheric boundary layer during midday (12 PM – 4 PM), providing relatively better pollutant dispersion compared to morning and evening inversions.',
      context: 'Government of India Health Advisory (Nov 2025) on diurnal ventilation timing.',
      expectedBenefit: 'Permits necessary air exchange to flush accumulated indoor CO2 and moisture when ambient dispersion is relatively favorable.',
      limitation: 'This is not a guaranteed clean-air window. If visible haze, burning odors, or heavy nearby traffic are present, keep windows closed. Always prioritize indoor source control.',
      source: 'MoHFW Health Advisory (Nov 2025); CPCB Guidelines',
      priority: 'medium',
      category: 'ventilation',
      timeOfDay: 'afternoon',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  }

  // Afternoon Errands
  afternoon.push({
    id: createId('rec-a-errand'),
    action: 'Combine multiple errands into a single consolidated trip during off-peak hours',
    reason: 'Cold vehicle starts consume up to twice as much fuel and produce high emissions during initial engine warm-up.',
    context: `Urban activity planning in ${preferences.location.city}.`,
    expectedBenefit: 'Reduces personal road travel exposure, saves vehicle fuel, and cuts localized stop-and-go emissions.',
    limitation: 'Requires pre-planning errands in chronological or geographic sequence.',
    source: 'BEE (Bureau of Energy Efficiency) Urban Transport Conservation Guide',
    priority: 'low',
    category: 'sustainable',
    timeOfDay: 'afternoon',
    impactType: 'both',
    isCompleted: false,
  });

  // ----------------------------------------------------
  // 7. EVENING COMMUTE & RUSH HOUR
  // ----------------------------------------------------
  if (isPoorOrWorse && commute !== 'work_from_home') {
    evening.push({
      id: createId('rec-e-com'),
      action: 'Stagger evening return departure away from peak rush hour (avoid 6:30 PM – 8:30 PM if flexible)',
      reason: `Evening rush hour coincides with sunset cooling, which collapses the boundary layer and traps vehicle emissions close to the street level (${category}, AQI: ${aqi}).`,
      context: `Commute mode: ${commute}. Evening ambient AQI: ${aqi}.`,
      expectedBenefit: 'Reduces commute travel time and drops peak roadside toxic gas inhalation (NO2, Benzene).',
      limitation: 'Depends on workplace flexibility and transit scheduling.',
      source: 'Central Pollution Control Board Urban Emissions Inventory',
      priority: isSevereOrVeryPoor ? 'high' : 'medium',
      category: 'commute',
      timeOfDay: 'evening',
      impactType: 'both',
      isCompleted: false,
    });
  }

  // ----------------------------------------------------
  // 8. EVENING INDOOR AIR PURIFIER / DAMP CLEANING
  // ----------------------------------------------------
  if (preferences.home.hasAirPurifier) {
    if (isSevereOrVeryPoor) {
      evening.push({
        id: createId('rec-e-pur'),
        action: 'Operate bedroom air purifier per manufacturer room-size specifications; verify filters are clean',
        reason: `During high ambient pollution (${category}, AQI: ${aqi}), indoor PM2.5 builds up through infiltration. A properly sized HEPA purifier maintains an indoor clean-air buffer.`,
        context: 'Air purifier available in household.',
        expectedBenefit: 'Lowers indoor PM2.5 concentrations in sleeping quarters during nighttime inversion hours.',
        limitation: 'Ensure air purifier does not use ozone generation (ionizers or electrostatic devices without ozone filters). Follow manufacturer filter replacement schedules.',
        source: 'MoHFW Health Advisory (Nov 2025); AHAM CADR Guidelines',
        priority: 'high',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isPoor || isModerate) {
      evening.push({
        id: createId('rec-e-pur'),
        action: 'Run bedroom air purifier on medium in the evening with doors and windows closed',
        reason: 'Pre-cleans the room before bedtime to lower particulate exposure during resting hours.',
        context: 'Air purifier available in household.',
        expectedBenefit: 'Brings bedroom air through air changes to lower baseline PM2.5 before sleep.',
        limitation: 'Ensure purifier intake is unobstructed. Clean pre-filters periodically per manufacturer instructions.',
        source: 'AHAM Guidelines; MoHFW Advisory',
        priority: isPoor ? 'high' : 'medium',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      // Good or Satisfactory
      evening.push({
        id: createId('rec-e-pur'),
        action: 'Air purifier maintenance: inspect pre-filters and run on low or auto as needed',
        reason: `Outdoor air is clean (${category}, AQI: ${aqi}). Purifier operation is elective and can focus on routine dust and allergen control.`,
        context: 'Air purifier available in clean ambient conditions.',
        expectedBenefit: 'Maintains appliance readiness and captures localized household dust.',
        limitation: 'Continuous high-speed operation is unnecessary in clean ambient conditions.',
        source: 'AHAM Guidelines',
        priority: 'low',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  } else {
    // No air purifier
    if (isPoorOrWorse) {
      evening.push({
        id: createId('rec-e-nopur'),
        action: 'Damp-mop hard floors with microfiber cloth instead of dry sweeping; use door sweeps',
        reason: 'Dry sweeping with traditional brooms resuspends settled fine dust into the air for hours. Damp mopping captures particles safely.',
        context: 'Household without mechanical air purifier during elevated pollution.',
        expectedBenefit: 'Eliminates dust resuspension, reducing indoor particulate spikes without specialized machinery.',
        limitation: 'Damp mopping captures settled dust on surfaces; it does not filter suspended airborne ultrafine particles.',
        source: 'US EPA Indoor Air Quality Tools for Schools; CPCB Advisory',
        priority: isSevereOrVeryPoor ? 'high' : 'medium',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else if (isModerate) {
      evening.push({
        id: createId('rec-e-nopur'),
        action: 'Damp-mop floors with damp microfiber cloth instead of dry sweeping',
        reason: 'Captures floor dust without resuspending fine particulates into the living area.',
        context: 'Routine household dust management.',
        expectedBenefit: 'Keeps settled particulate matter low.',
        limitation: 'Use damp cotton or microfiber mops.',
        source: 'CPCB Advisory',
        priority: 'medium',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'exposure_reduction',
        isCompleted: false,
      });
    } else {
      // Good or Satisfactory
      evening.push({
        id: createId('rec-e-nopur'),
        action: 'Routine housekeeping: damp-wipe surfaces to keep household dust low',
        reason: `Outdoor air is ${category} (AQI: ${aqi}). Standard cleaning maintains a comfortable, dust-free indoor environment.`,
        context: 'Routine housekeeping in clean air.',
        expectedBenefit: 'Maintains general indoor hygiene.',
        limitation: 'None.',
        source: 'CPCB Advisory',
        priority: 'low',
        category: 'indoor_air',
        timeOfDay: 'evening',
        impactType: 'health_benefit',
        isCompleted: false,
      });
    }
  }

  // ----------------------------------------------------
  // 9. INDOOR INCENSE & COMBUSTION AWARENESS (Priority calibrated)
  // ----------------------------------------------------
  if (isPoorOrWorse) {
    evening.push({
      id: createId('rec-e-incense'),
      action: 'Avoid burning agarbatti (incense), dhoop, mosquito coils, or decorative candles in enclosed rooms',
      reason: `Indoor combustion sources generate concentrated localized spikes of PM2.5, benzene, and formaldehyde that compound outdoor smog burdens (${category}, AQI: ${aqi}).`,
      context: 'Evening religious rituals or insect repellent habits during high pollution episodes.',
      expectedBenefit: 'Prevents extreme localized indoor pollution spikes that aggravate respiratory passages.',
      limitation: 'Use liquid vaporizer repellents or LED diyas; if burning incense for rituals, perform near external openings or in well-ventilated courtyards.',
      source: 'National Institute of Environmental Health Sciences (NIEHS); MoHFW Advisory',
      priority: 'medium',
      category: 'indoor_air',
      timeOfDay: 'evening',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else {
    evening.push({
      id: createId('rec-e-incense'),
      action: 'Minimize burning incense or mosquito coils in closed rooms; ensure good ventilation during rituals',
      reason: 'A burning incense stick or mosquito coil in a closed room can produce substantial particulate concentrations and volatile organics.',
      context: 'Routine indoor combustion awareness.',
      expectedBenefit: 'Maintains clean indoor air quality during evening rituals.',
      limitation: 'Ensure rooms have cross-ventilation when burning incense.',
      source: 'NIEHS Indoor Air Studies',
      priority: 'low',
      category: 'indoor_air',
      timeOfDay: 'evening',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  }

  // ----------------------------------------------------
  // 10. NIGHT RECOMMENDATIONS (Sleep environment & airway care)
  // ----------------------------------------------------
  if (isSevereOrVeryPoor) {
    night.push({
      id: createId('rec-n-sleep'),
      action: 'Ensure bedroom is sealed overnight; close windows to block nighttime pollution infiltration',
      reason: `Night-time temperatures cause atmospheric subsidence, concentrating ambient pollution into the early morning hours (${category}, AQI: ${aqi}).`,
      context: `Sleeping hours: ${preferences.schedule.sleepTime} to ${preferences.schedule.wakeUpTime}.`,
      expectedBenefit: 'Protects the respiratory tract during continuous resting ventilation.',
      limitation: 'Use an interior ceiling fan on low-medium to maintain air movement without pulling in outside air.',
      source: 'MoHFW Air Pollution Advisory; Sleep Medicine Reviews',
      priority: 'high',
      category: 'indoor_air',
      timeOfDay: 'night',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else if (isPoor) {
    night.push({
      id: createId('rec-n-sleep'),
      action: 'Keep bedroom windows closed overnight to prevent nighttime pollution drift',
      reason: 'Cooling evening air can bring elevated ground-level particulate concentrations into open windows.',
      context: `Sleeping hours: ${preferences.schedule.sleepTime} to ${preferences.schedule.wakeUpTime}.`,
      expectedBenefit: 'Shields sleeping quarters from nighttime particulate intrusion.',
      limitation: 'Keep interior bedroom door slightly ajar to maintain airflow.',
      source: 'CPCB Guidelines',
      priority: 'medium',
      category: 'indoor_air',
      timeOfDay: 'night',
      impactType: 'exposure_reduction',
      isCompleted: false,
    });
  } else if (isModerate) {
    night.push({
      id: createId('rec-n-sleep'),
      action: 'Maintain comfortable sleeping environment; keep street-facing windows closed if near heavy traffic',
      reason: `Moderate AQI (${aqi}). Closing street-facing windows avoids roadside particulate spikes.`,
      context: `Sleeping hours: ${preferences.schedule.sleepTime} to ${preferences.schedule.wakeUpTime}.`,
      expectedBenefit: 'Ensures undisturbed sleep with stable indoor air quality.',
      limitation: 'None.',
      source: 'CPCB Guidelines',
      priority: 'low',
      category: 'indoor_air',
      timeOfDay: 'night',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  } else {
    // Good or Satisfactory
    night.push({
      id: createId('rec-n-sleep'),
      action: 'Maintain comfortable bedroom ventilation; clean outdoor air supports restorative sleep and low CO2',
      reason: `Outdoor air is clean (${category}, AQI: ${aqi}). Normal ventilation keeps indoor CO2 low and supports deep sleep.`,
      context: `Sleeping hours: ${preferences.schedule.sleepTime} to ${preferences.schedule.wakeUpTime}.`,
      expectedBenefit: 'Low indoor CO2 levels prevent morning grogginess and support restful sleep.',
      limitation: 'None under current atmospheric conditions.',
      source: 'ASHRAE Indoor Air Quality Guidelines',
      priority: 'low',
      category: 'indoor_air',
      timeOfDay: 'night',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  }

  // Overnight Hydration and Airway Care
  if (isModerateOrWorse) {
    night.push({
      id: createId('rec-n-care'),
      action: 'Stay well hydrated and consider a warm saline gargle before sleep',
      reason: `Fine particulate exposure and dry air can irritate upper respiratory mucous membranes (${category}, AQI: ${aqi}).`,
      context: `Current AQI: ${aqi} (${category}).`,
      expectedBenefit: 'Hydrates upper airway linings, soothing throat irritation and supporting natural mucosal clearance.',
      limitation: 'This is a supportive comfort measure and does not substitute for medical treatment or exposure avoidance.',
      source: 'Indian Academy of Pediatrics & Chest Society Guidelines',
      priority: 'low',
      category: 'general',
      timeOfDay: 'night',
      impactType: 'health_benefit',
      isCompleted: false,
    });
  }

  // Generate Summary and Key Message
  let summary = '';
  let keyMessage = '';

  if (category === 'Severe') {
    keyMessage = 'EMERGENCY AIR ADVISORY: Severe air pollution. Stay indoors, eliminate all outdoor exertion, and keep rooms strictly sealed with air purification.';
    summary = `Today's AQI is in the SEVERE zone (${aqi}). Outdoor exposure represents a serious health hazard for all individuals. Prioritize remaining indoors, utilizing certified N95 respirators if transit is unavoidable, keeping indoor spaces sealed, and monitoring vulnerable family members.`;
  } else if (category === 'Very Poor') {
    keyMessage = 'VERY POOR AIR: Protect your lungs by relocating all exercise indoors and wearing N95 masks during transit.';
    summary = `Current AQI is Very Poor (${aqi}). Vulnerable groups, children, and elderly members should remain indoors with activity levels kept low. Limit non-essential travel and optimize indoor air filtration.`;
  } else if (category === 'Poor') {
    keyMessage = 'POOR AIR: Reduce prolonged outdoor exposure, switch workouts indoors, and optimize ventilation timing.';
    summary = `Air quality is currently Poor (${aqi}). Temperature inversions trap pollution during morning and evening rush hours. Midday hours offer relatively better dispersion if ventilation is needed. Protect yourself during transit.`;
  } else if (category === 'Moderate') {
    keyMessage = 'MODERATE AIR: Sensitive individuals should limit prolonged outdoor exertion; routine outdoor tasks are acceptable for healthy adults.';
    summary = `AQI is Moderate (${aqi}). Healthy individuals can proceed with typical routines with reasonable precautions. Sensitive household members should take breaks during strenuous outdoor exertion.`;
  } else if (category === 'Satisfactory') {
    keyMessage = 'SATISFACTORY AIR: Acceptable ambient air quality. Normal outdoor activities and natural ventilation can proceed.';
    summary = `Current AQI is Satisfactory (${aqi}). Atmospheric conditions are broadly favorable. Sensitive individuals with respiratory conditions should monitor symptoms during prolonged strenuous exertion.`;
  } else {
    keyMessage = 'GOOD AIR: Clean ambient air quality. Outdoor activities, workouts, and natural cross-ventilation are encouraged today.';
    summary = `Current AQI is Good (${aqi}). Excellent atmospheric conditions for all age groups to enjoy outdoor activities and ventilate living spaces.`;
  }

  return {
    date: new Date().toISOString().split('T')[0]!,
    location: preferences.location.city,
    currentAqi: aqi,
    aqiCategory: category,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false,
    isFallback: false,
    morning,
    afternoon,
    evening,
    night,
    summary,
    keyMessage,
  };
}

/**
 * Generate room-specific indoor air quality recommendations
 */
export function generateIndoorRecommendations(
  aqData: AirQualityData,
  preferences: UserPreferences,
  room?: RoomType
): IndoorRecommendation[] {
  const { aqi, category } = aqData;
  const isHighPollution = category === 'Poor' || category === 'Very Poor' || category === 'Severe';

  const rooms: RoomType[] = room ? [room] : ['living_room', 'bedroom', 'kitchen', 'study'];
  const results: IndoorRecommendation[] = [];

  for (const r of rooms) {
    if (r === 'living_room') {
      results.push({
        room: 'living_room',
        pollutantSources: [
          'Outdoor dust infiltration through entryways and windows',
          'Footwear tracking outdoor soil, road dust, and particulate soot',
          'Upholstery and sofa fabric fiber shedding',
          'Incense (agarbatti), scented room sprays, and aerosol air fresheners',
        ],
        ventilationAdvice: isHighPollution
          ? 'Keep main balcony doors and street-facing windows shut throughout the day. If airing is necessary, restrict to brief midday hours away from peak traffic.'
          : 'Open opposite windows for 20-30 minutes during morning hours to generate cross-ventilation and exhaust accumulated CO2.',
        purifierAdvice: preferences.home.hasAirPurifier
          ? 'Position air purifier away from corners and furniture obstacles. Maintain fan speed at automatic or medium during family gatherings.'
          : 'Damp-mop floors with microfiber cloths to capture settled dust without resuspending particles; keep entryway doormats clean.',
        recommendations: [
          {
            id: createId('ind-lr-shoe'),
            action: 'Establish a strict "shoes off at entry" policy with an outdoor doormat',
            reason: 'Up to 60% of indoor dust and outdoor road residue is tracked inside on shoe soles.',
            context: 'Main entrance leading into living room.',
            expectedBenefit: 'Cuts heavy metal, pesticide, and soot accumulation in living area carpets and floors.',
            limitation: 'Requires designated shoe rack outside or in entrance vestibule.',
            source: 'US EPA Indoor Air Quality Guidelines',
            priority: isHighPollution ? 'high' : 'medium',
            category: 'indoor_air',
            timeOfDay: 'morning',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
          {
            id: createId('ind-lr-spray'),
            action: 'Avoid synthetic chemical air fresheners and aerosol sprays',
            reason: 'Aerosol fresheners release volatile organic compounds (VOCs) and terpenes that react with ozone to form secondary fine organic aerosols.',
            context: 'Room fragrance habits.',
            expectedBenefit: 'Prevents chemical respiratory irritation and headaches among household members.',
            limitation: 'Rely on clean ventilation or natural simmer pots with citrus/cinnamon for scent.',
            source: 'Environmental Science & Technology Journal (2020)',
            priority: 'medium',
            category: 'indoor_air',
            timeOfDay: 'afternoon',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
        ],
      });
    }

    if (r === 'bedroom') {
      results.push({
        room: 'bedroom',
        pollutantSources: [
          'Mattress and bedding dust mites and dead skin dander',
          'Exhaled carbon dioxide (CO2) accumulating during sleep period',
          'Infiltration from window frames during cold night-time inversion',
          'Synthetic fabric off-gassing and wardrobe mothballs',
        ],
        ventilationAdvice: isHighPollution
          ? 'Keep bedroom windows sealed overnight. If the room feels warm, use an interior oscillating fan to circulate air rather than opening outside windows.'
          : 'Aerate bedroom bedding by opening windows for 15-20 minutes after waking up to dissipate overnight humidity.',
        purifierAdvice: preferences.home.hasAirPurifier
          ? 'Place air purifier 1.5–2 meters from the head of the bed, ensuring clean airflow directs towards the breathing zone. Run on low/whisper mode for peaceful sleep.'
          : 'Wash pillowcases and sheets weekly in warm water (>55°C) to denature dust mite allergens and reduce particulate triggers.',
        recommendations: [
          {
            id: createId('ind-br-seal'),
            action: 'Inspect window frame weatherstripping and use draft stoppers during pollution episodes',
            reason: 'Gaps around standard sliding aluminum or wooden windows allow outdoor soot infiltration during nighttime inversions.',
            context: `Bedroom protection during AQI ${aqi} (${category}).`,
            expectedBenefit: 'Maintains cleaner microclimate inside sleeping quarters, shielding lungs during resting hours.',
            limitation: 'Ensure interior doors maintain slight airflow to prevent excessive CO2 buildup.',
            source: 'Central Building Research Institute (CBRI) Guidelines',
            priority: isHighPollution ? 'high' : 'low',
            category: 'indoor_air',
            timeOfDay: 'night',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
          {
            id: createId('ind-br-linen'),
            action: 'Shake out rugs and dust covers outside rather than indoors',
            reason: 'Beating or vigorously shaking rugs inside bedrooms immediately introduces millions of dust fragments into the breathing zone.',
            context: 'Routine housekeeping in sleeping quarters.',
            expectedBenefit: 'Prevents acute nighttime coughing fits and allergic rhinitis triggers.',
            limitation: 'Perform outside on a balcony or courtyard with a simple mask.',
            source: 'Indian Chest Society Clinical Practice Guidelines',
            priority: 'medium',
            category: 'indoor_air',
            timeOfDay: 'morning',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
        ],
      });
    }

    if (r === 'kitchen') {
      const hasExhaust = preferences.home.hasExhaust;
      results.push({
        room: 'kitchen',
        pollutantSources: [
          'High-heat oil frying emitting fine aerosolized droplets and acrolein',
          'Gas burner combustion releasing nitrogen dioxide (NO2) and carbon monoxide (CO)',
          'Food seasoning burning (tadka/tempering with spices releasing capsaicin)',
          'Toaster and oven heating element crusting',
        ],
        ventilationAdvice: hasExhaust
          ? 'Isolate the kitchen: keep interior doors to living areas closed while running the outdoor exhaust fan. Keep exhaust running for 5–10 minutes post-cooking.'
          : 'Isolate the kitchen: keep interior doors to living areas closed, cook with tight lids, and avoid unventilated high-heat frying. Crack an exterior window if outdoor air is clean to allow combustion gases to escape. Do NOT place room air purifiers near cooking grease.',
        purifierAdvice: 'Do NOT place HEPA air purifiers directly in cooking kitchens: hot grease and oil vapors quickly coat the HEPA fibers, permanently clogging the filter and causing foul odors.',
        recommendations: [
          {
            id: createId('ind-ki-exh'),
            action: hasExhaust
              ? 'Turn kitchen exhaust on BEFORE lighting the stove and keep on for 5–10 minutes post-cooking'
              : 'Isolate kitchen from living quarters, cook with lids on pots, and avoid unventilated high-heat frying',
            reason: hasExhaust
              ? 'Cooking generates sudden spikes in ultrafine particles and NO2 gas that quickly drift into surrounding living areas if exhaust is not preemptively running.'
              : 'Without an outdoor-venting exhaust fan, combustion gases (NO2, CO) and oil droplets accumulate indoors.',
            context: `Cooking setup: ${preferences.home.cookingFuel || 'gas'} (${hasExhaust ? 'exhaust fan available' : 'no exhaust fan'}).`,
            expectedBenefit: hasExhaust
              ? 'Captures combustion gases and cooking aerosols at the point of generation before they disperse into the home.'
              : 'Isolating the kitchen door prevents combustion by-products from penetrating bedrooms and living areas.',
            limitation: hasExhaust
              ? 'Exhaust fans consume slight electrical power and create background noise.'
              : 'Requires source control: avoid prolonged searing or charring in unventilated spaces.',
            source: 'Lawrence Berkeley National Laboratory (LBNL) Indoor Kitchen Air Study; WHO Guidelines',
            priority: 'high',
            category: 'cooking',
            timeOfDay: 'afternoon',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
          {
            id: createId('ind-ki-lid'),
            action: 'Cook with lids on pots and pans whenever possible, especially during boiling and simmering',
            reason: 'Covering cookware contains grease droplets, reduces required cooking energy, and minimizes indoor moisture accumulation.',
            context: 'Daily culinary practices.',
            expectedBenefit: 'Reduces aerosolized cooking emissions and lowers gas/electricity consumption.',
            limitation: 'Certain deep frying or crisping recipes cannot utilize closed lids.',
            source: 'BEE Energy Conservation & Clean Cooking Handbook',
            priority: 'medium',
            category: 'cooking',
            timeOfDay: 'evening',
            impactType: 'both',
            isCompleted: false,
          },
        ],
      });
    }

    if (r === 'study') {
      results.push({
        room: 'study',
        pollutantSources: [
          'Laser printers emitting ultrafine toner particles and ozone during print runs',
          'Computer cooling fans circulating floor dust',
          'Paper dust and cardboard storage off-gassing',
          'Elevated CO2 levels from closed doors during prolonged work sessions',
        ],
        ventilationAdvice: 'Maintain gentle cross-flow or open door to hallway occasionally to keep CO2 levels below 1000 ppm, preventing cognitive fatigue and drowsiness.',
        purifierAdvice: preferences.home.hasAirPurifier
          ? 'A compact desktop or small room HEPA filter placed on the desk provides a clean-air zone for the seated worker.'
          : 'Keep desk surfaces clean with a damp cloth; avoid blowing compressed air into electronics while in the room.',
        recommendations: [
          {
            id: createId('ind-st-print'),
            action: 'Locate heavy laser printers in well-ventilated corners away from immediate desk seating',
            reason: 'Laser printer fusers heat toner powders to ~200°C, releasing ultrafine nanoparticles and volatile organics during large print jobs.',
            context: 'Home office or study workspace.',
            expectedBenefit: 'Prevents acute inhalation of toner nanoparticles that can penetrate deep into alveoli.',
            limitation: 'Requires minor rearrangement of desk cabling.',
            source: 'International Journal of Environmental Research and Public Health (2021)',
            priority: 'medium',
            category: 'indoor_air',
            timeOfDay: 'afternoon',
            impactType: 'exposure_reduction',
            isCompleted: false,
          },
          {
            id: createId('ind-st-co2'),
            action: 'Open study door for 5 minutes every hour during long focused working sessions',
            reason: 'In small closed rooms, a single adult generates enough CO2 in 60 minutes to raise levels above 1200 ppm, reducing cognitive focus and reaction speed.',
            context: 'Work from home or studying in closed room.',
            expectedBenefit: 'Maintains peak mental alertness, prevents afternoon brain fog, and reduces eye strain.',
            limitation: 'Briefly interrupts acoustic privacy.',
            source: 'Harvard T.H. Chan School of Public Health COGfx Study',
            priority: 'medium',
            category: 'general',
            timeOfDay: 'afternoon',
            impactType: 'health_benefit',
            isCompleted: false,
          },
        ],
      });
    }
  }

  return results;
}

/**
 * Generate evidence-based sustainable alternatives tailored to user's lifestyle
 */
export function generateSustainableAlternatives(
  aqData: AirQualityData,
  preferences: UserPreferences
): SustainableAlternative[] {
  const { category } = aqData;
  const isHighPollution = category === 'Poor' || category === 'Very Poor' || category === 'Severe';
  const commute = preferences.lifestyle.commuteMode;

  const alternatives: SustainableAlternative[] = [
    {
      id: createId('sus-commute-solo'),
      currentBehavior: `Solo driving or private vehicle travel (${commute}) for daily commute`,
      suggestedAlternative: isHighPollution
        ? 'Shift to Air-Conditioned Metro rail or carpooling with colleagues, keeping car windows sealed'
        : 'Shift to Metro rail, shared electric buses, or cycling along secondary green lanes',
      exposureImpact: isHighPollution
        ? 'Reduces reliance on individual vehicle emissions. However, personal exposure cannot be assumed lower without local measurements, as conditions vary at station access points, outdoor platforms, and inside passenger coaches.'
        : 'Reduces individual contribution to street-level vehicle exhaust; personal exposure depends on local station and route conditions.',
      emissionImpact: 'Saves approximately 120–180g of CO2 per passenger-kilometer compared to solo petrol/diesel cars, plus cuts localized NOx and particulate emissions.',
      otherBenefits: 'Eliminates driving stress, saves daily parking hassles, and reduces monthly fuel expenses by 50–70%.',
      practicalConsideration: 'Check last-mile connectivity from metro station to office before finalizing route.',
      safetyNote: isHighPollution
        ? 'CRITICAL: Do NOT switch to cycling or open walking commute during Severe/Poor AQI simply to reduce emissions; your respiratory health must always take priority over personal emission reduction.'
        : undefined,
    },
    {
      id: createId('sus-idle'),
      currentBehavior: 'Leaving vehicle engine idling while waiting at traffic signals, school pickups, or railway crossings',
      suggestedAlternative: 'Switch off the ignition for any stop anticipated to exceed 20 seconds',
      exposureImpact: 'Eliminates the dense micro-cloud of exhaust that enters through vehicle fresh air intakes while stationary behind other idling vehicles.',
      emissionImpact: 'Idling for just 10 minutes wastes fuel and generates direct CO2 and toxic CO into street-level air.',
      otherBenefits: 'Saves fuel costs and reduces engine thermal wear during hot city conditions.',
      practicalConsideration: 'Modern vehicle starter motors and batteries are engineered to handle thousands of restart cycles without accelerated wear.',
    },
    {
      id: createId('sus-cook-fuel'),
      currentBehavior: preferences.home.cookingFuel === 'wood' || preferences.home.cookingFuel === 'mixed'
        ? 'Using solid biomass, wood, or coal for cooking or heating'
        : 'Cooking exclusively on open gas burners without lids or induction pairing',
      suggestedAlternative: preferences.home.cookingFuel === 'wood' || preferences.home.cookingFuel === 'mixed'
        ? 'Transition to Pradhan Mantri Ujjwala Yojana (PMUY) LPG or clean induction electric cooktops'
        : 'Use energy-efficient induction cooktops or electric pressure cookers for long-simmering dishes',
      exposureImpact: 'Eliminates household indoor biomass smoke, which is among the top environmental health hazards globally.',
      emissionImpact: 'Induction cookers transfer 85–90% of electrical energy directly into food compared to only 40% thermal efficiency for open gas flames, substantially cutting primary energy waste.',
      otherBenefits: 'Cooking time reduced by 30%, cooler kitchen environment in summer, and easier cleaning without scorched pot bottoms.',
      practicalConsideration: 'Induction requires compatible magnetic stainless steel or cast iron cookware.',
    },
    {
      id: createId('sus-waste-burn'),
      currentBehavior: 'Burning garden leaf litter, dry sweepings, or domestic paper waste in street corners or courtyards',
      suggestedAlternative: 'Adopt household composting for leaves and organic matter; utilize municipal segregated waste collection',
      exposureImpact: 'Open biomass smoldering generates high concentrations of dioxins, furans, and black carbon at ground breathing level right outside your doorstep.',
      emissionImpact: 'Composting converts organic matter into stable soil humus without open combustion emissions that spike localized particulate levels.',
      otherBenefits: 'Produces rich organic soil amendment for balcony plants and urban kitchen gardens for zero cost.',
      practicalConsideration: 'Ensure compost bin has adequate aeration to prevent anaerobic odors.',
      safetyNote: 'Open burning of municipal solid waste or leaves is strictly illegal under National Green Tribunal (NGT) orders across Indian urban areas.',
    },
    {
      id: createId('sus-energy-conserve'),
      currentBehavior: 'Running air conditioners on low temperatures (18°C–20°C) with unsealed door gaps',
      suggestedAlternative: 'Set AC to 24°C–26°C and pair with ceiling fan running at low speed',
      exposureImpact: 'Moderate temperatures reduce thermal stress and airway dryness caused by excessively cold indoor air.',
      emissionImpact: 'Every 1°C increase in AC temperature saves approximately 6% of compressor electricity consumption, reducing fossil fuel burn at power plants.',
      otherBenefits: 'Lowers monthly electricity utility bills while extending AC compressor lifespan.',
      practicalConsideration: 'Clean AC indoor dust filters every 2 weeks during peak smog season to maintain airflow efficiency.',
    },
  ];

  return alternatives;
}
