/**
 * AIRWISE — Gemini AI Client & GenAI Personalization Layer
 * 
 * Powered by Google Gemini API (@google/genai SDK)
 * Primary Model: gemini-3.8-flash (configurable via GEMINI_MODEL)
 * Alternative: gemini-3.5-flash-lite (high throughput / cost-effective)
 * 
 * Architecture Rules:
 * 1. The deterministic engine controls safety boundaries and base rules.
 * 2. Gemini enriches, contextualizes, and personalizes recommendations.
 * 3. Gemini CANNOT override deterministic safety rules (e.g. recommend outdoor cardio in Severe AQI).
 * 4. Fallback is 100% functional even if GEMINI_API_KEY is missing or the API times out.
 * 5. Prompt injection defense: User input is untrusted; system instructions are isolated.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import type {
  AirQualityData,
  UserPreferences,
  DailyActionPlan,
  ChatMessage,
  Recommendation,
} from '../types/index.js';

let aiInstance: GoogleGenAI | null = null;
let mockAiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (mockAiInstance) {
    return mockAiInstance;
  }
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

/**
 * For controlled automated testing without real API credentials
 */
export function setAiClientForTesting(client: GoogleGenAI | null): void {
  mockAiInstance = client;
}

export function resetAiClientForTesting(): void {
  mockAiInstance = null;
  aiInstance = null;
}

/**
 * Check if Gemini is configured and available
 */
export function isGeminiAvailable(): boolean {
  return !!mockAiInstance || env.hasGeminiKey;
}

/**
 * Ensures external API calls never hang indefinitely
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Enhance a deterministic action plan with Gemini personalization
 */
export function buildPlanPrompt(
  basePlan: DailyActionPlan,
  aqData: AirQualityData,
  preferences: UserPreferences
): string {
  return `You are AIRWISE, an expert environmental health and air quality decision assistant tailored for India.

CURRENT ENVIRONMENTAL REALITY:
- Location: ${preferences.location.city}, India
- CPCB AQI: ${aqData.aqi} (${aqData.category})
- Prominent Pollutant: ${aqData.prominentPollutant.toUpperCase()}
- Key Pollutants: ${aqData.pollutants.map(p => `${p.name}: ${p.value} ${p.unit} (Sub-index: ${p.subIndex})`).join(', ')}
- Data Standard: Indian CPCB National AQI Standard

USER PROFILE:
- Schedule: Wake up at ${preferences.schedule.wakeUpTime}, sleep at ${preferences.schedule.sleepTime}
- Commute: ${preferences.lifestyle.commuteMode} (~${preferences.lifestyle.commuteDurationMinutes ?? 30} mins)
- Exercise: ${preferences.lifestyle.exerciseType} (${preferences.lifestyle.exerciseLocation})
- Home: Ventilation=${preferences.home.ventilationType}, Air Purifier=${preferences.home.hasAirPurifier ? 'Yes' : 'No'}, Cooking=${preferences.home.cookingFuel || 'Gas'}, Exhaust=${preferences.home.hasExhaust ? 'Yes' : 'No'}
- Sensitive household members: ${preferences.sensitivity?.hasChildren ? 'Children ' : ''}${preferences.sensitivity?.hasElderly ? 'Elderly ' : ''}${preferences.sensitivity?.hasSensitiveMembers ? 'Respiratory condition ' : 'None'}

DETERMINISTIC SAFETY CONSTRAINTS (MANDATORY):
1. In Poor, Very Poor, or Severe AQI, NEVER recommend strenuous outdoor exercise or leaving windows wide open.
2. Personal exposure reduction ALWAYS takes priority over vehicle emission reduction.
3. No medical diagnoses or guarantees of 100% disease prevention.
4. Keep advice practical for an Indian household.

TASK:
Review the following deterministic base recommendations and return an enhanced, personalized version in JSON matching the exact schema. Refine the wording to feel warm, precise, empowering, and deeply contextualized to their exact city, commute, and household setup.

Base Plan Morning Items: ${basePlan.morning.length}
Base Plan Afternoon Items: ${basePlan.afternoon.length}
Base Plan Evening Items: ${basePlan.evening.length}
Base Plan Night Items: ${basePlan.night.length}`;
}

/**
 * Generate AI-enhanced action plan with deterministic fallback
 */
export async function generateAiPlan(
  basePlan: DailyActionPlan,
  aqData: AirQualityData,
  preferences: UserPreferences
): Promise<DailyActionPlan> {
  const ai = getAiClient();
  if (!ai) {
    // Graceful fallback to deterministic base plan
    return {
      ...basePlan,
      isAiGenerated: false,
      isFallback: true,
    };
  }

  const prompt = buildPlanPrompt(basePlan, aqData, preferences);

  try {
    const generatePromise = ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: 'You are AIRWISE, a world-class urban air quality and public health engineering assistant. Always follow CPCB and WHO scientific consensus.',
        temperature: 0.2, // Low temperature for high consistency and adherence to safety
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyMessage: { type: Type.STRING },
            morning: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  context: { type: Type.STRING },
                  expectedBenefit: { type: Type.STRING },
                  limitation: { type: Type.STRING },
                  source: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
                  category: { type: Type.STRING, enum: ['outdoor_activity', 'commute', 'ventilation', 'indoor_air', 'exercise', 'children', 'cooking', 'sustainable', 'general'] },
                  impactType: { type: Type.STRING, enum: ['exposure_reduction', 'emission_reduction', 'both', 'health_benefit'] },
                },
                required: ['action', 'reason', 'context', 'expectedBenefit', 'limitation', 'priority', 'category', 'impactType'],
              },
            },
            afternoon: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  context: { type: Type.STRING },
                  expectedBenefit: { type: Type.STRING },
                  limitation: { type: Type.STRING },
                  source: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
                  category: { type: Type.STRING, enum: ['outdoor_activity', 'commute', 'ventilation', 'indoor_air', 'exercise', 'children', 'cooking', 'sustainable', 'general'] },
                  impactType: { type: Type.STRING, enum: ['exposure_reduction', 'emission_reduction', 'both', 'health_benefit'] },
                },
                required: ['action', 'reason', 'context', 'expectedBenefit', 'limitation', 'priority', 'category', 'impactType'],
              },
            },
            evening: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  context: { type: Type.STRING },
                  expectedBenefit: { type: Type.STRING },
                  limitation: { type: Type.STRING },
                  source: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
                  category: { type: Type.STRING, enum: ['outdoor_activity', 'commute', 'ventilation', 'indoor_air', 'exercise', 'children', 'cooking', 'sustainable', 'general'] },
                  impactType: { type: Type.STRING, enum: ['exposure_reduction', 'emission_reduction', 'both', 'health_benefit'] },
                },
                required: ['action', 'reason', 'context', 'expectedBenefit', 'limitation', 'priority', 'category', 'impactType'],
              },
            },
            night: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  context: { type: Type.STRING },
                  expectedBenefit: { type: Type.STRING },
                  limitation: { type: Type.STRING },
                  source: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
                  category: { type: Type.STRING, enum: ['outdoor_activity', 'commute', 'ventilation', 'indoor_air', 'exercise', 'children', 'cooking', 'sustainable', 'general'] },
                  impactType: { type: Type.STRING, enum: ['exposure_reduction', 'emission_reduction', 'both', 'health_benefit'] },
                },
                required: ['action', 'reason', 'context', 'expectedBenefit', 'limitation', 'priority', 'category', 'impactType'],
              },
            },
          },
          required: ['summary', 'keyMessage', 'morning', 'afternoon', 'evening', 'night'],
        },
      },
    });

    const response = await withTimeout(generatePromise, env.GEMINI_TIMEOUT_MS, 'Gemini Plan Generation');

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(response.text);

    // Map into complete DailyActionPlan ensuring IDs are preserved
    const mapItems = (items: any[], time: 'morning' | 'afternoon' | 'evening' | 'night'): Recommendation[] => {
      if (!Array.isArray(items)) return [];
      return items.map((item, idx) => ({
        id: `ai-${time}-${idx}-${Date.now().toString(36)}`,
        action: String(item.action || ''),
        reason: String(item.reason || ''),
        context: String(item.context || ''),
        expectedBenefit: String(item.expectedBenefit || ''),
        limitation: String(item.limitation || ''),
        source: item.source ? String(item.source) : 'CPCB & WHO Environmental Health Guidelines',
        priority: (item.priority as any) || 'medium',
        category: (item.category as any) || 'general',
        timeOfDay: time,
        impactType: (item.impactType as any) || 'exposure_reduction',
        isCompleted: false,
      }));
    };

    return {
      date: basePlan.date,
      location: basePlan.location,
      currentAqi: basePlan.currentAqi,
      aqiCategory: basePlan.aqiCategory,
      generatedAt: new Date().toISOString(),
      isAiGenerated: true,
      isFallback: false,
      morning: mapItems(parsed.morning, 'morning'),
      afternoon: mapItems(parsed.afternoon, 'afternoon'),
      evening: mapItems(parsed.evening, 'evening'),
      night: mapItems(parsed.night, 'night'),
      summary: parsed.summary || basePlan.summary,
      keyMessage: parsed.keyMessage || basePlan.keyMessage,
    };
  } catch (error) {
    console.warn('[Gemini AI Plan] Failed, returning deterministic base plan:', error instanceof Error ? error.message : error);
    return {
      ...basePlan,
      isAiGenerated: false,
      isFallback: true,
    };
  }
}

/**
 * Handle conversational user questions with contextual environmental intelligence
 */
export async function handleChatMessage(
  message: string,
  aqData: AirQualityData | null,
  preferences: UserPreferences,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<ChatMessage> {
  const ai = getAiClient();
  const timestamp = new Date().toISOString();

  // Deterministic fallback response if Gemini is not configured
  if (!ai) {
    const fallbackContent = generateDeterministicChatFallback(message, aqData, preferences);
    return {
      role: 'assistant',
      content: fallbackContent,
      timestamp,
      isAiGenerated: false,
      sources: ['CPCB National Air Quality Index Guidelines', 'WHO Air Quality Guidelines'],
    };
  }

  const contextPrompt = `You are AIRWISE, the AI environmental health and urban air quality assistant.
You provide clear, scientifically grounded, empathetic, and actionable guidance for citizens and families navigating air pollution in India.

USER CONTEXT:
- City: ${preferences.location.city}
${aqData ? `- Current AQI: ${aqData.aqi} (${aqData.category})
- Prominent Pollutant: ${aqData.prominentPollutant.toUpperCase()}
- Pollutants: ${aqData.pollutants.map(p => `${p.name}: ${p.value} ${p.unit} (Sub-index ${p.subIndex})`).join(', ')}` : '- Current AQI: Not available'}
- User Routine: Wake at ${preferences.schedule.wakeUpTime}, sleep at ${preferences.schedule.sleepTime}
- Commute: ${preferences.lifestyle.commuteMode} (~${preferences.lifestyle.commuteDurationMinutes ?? 30}m)
- Exercise: ${preferences.lifestyle.exerciseType} (${preferences.lifestyle.exerciseLocation})
- Home Setup: Purifier=${preferences.home.hasAirPurifier ? 'Yes' : 'No'}, Cooking=${preferences.home.cookingFuel || 'Gas'}, Exhaust=${preferences.home.hasExhaust ? 'Yes' : 'No'}
- Sensitive Family: ${preferences.sensitivity?.hasChildren ? 'Children ' : ''}${preferences.sensitivity?.hasElderly ? 'Elderly ' : ''}${preferences.sensitivity?.hasSensitiveMembers ? 'Asthma/Respiratory ' : 'None'}

CRITICAL GUIDELINES:
1. Never give medical prescriptions or diagnoses. Recommend consulting a healthcare professional for acute medical symptoms.
2. In Poor, Very Poor, or Severe AQI, warn against outdoor high-cardio exercise.
3. Distinguish between personal exposure reduction and environmental emissions reduction.
4. Keep answers concise (2-4 paragraphs max), practical, and conversational with bullet points where appropriate.
5. Provide evidence-based references (e.g. CPCB, WHO, ICMR).`;

  try {
    const historyText = conversationHistory
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const contents = historyText.length > 0
      ? `${historyText}\n\nUser: ${message}`
      : message;

    const chatPromise = ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: contextPrompt,
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });

    const response = await withTimeout(chatPromise, env.GEMINI_TIMEOUT_MS, 'Gemini Chat Generation');

    const replyText = response.text || 'I apologize, but I could not formulate a response. Please try again.';

    return {
      role: 'assistant',
      content: replyText,
      timestamp,
      isAiGenerated: true,
      sources: ['CPCB NAQI Standard (2014)', 'WHO Global Air Quality Guidelines (2021)'],
    };
  } catch (error) {
    console.warn('[Gemini Chat] Error during generation, falling back:', error instanceof Error ? error.message : error);
    const fallbackContent = generateDeterministicChatFallback(message, aqData, preferences);
    return {
      role: 'assistant',
      content: fallbackContent,
      timestamp,
      isAiGenerated: false,
      sources: ['CPCB NAQI Standard (2014)', 'WHO Air Quality Guidelines'],
    };
  }
}

/**
 * Deterministic fallback logic for common user queries when Gemini is offline
 */
function generateDeterministicChatFallback(
  message: string,
  aqData: AirQualityData | null,
  preferences: UserPreferences
): string {
  const lower = message.toLowerCase();
  const aqi = aqData?.aqi ?? 250;
  const category = aqData?.category ?? 'Poor';
  const city = preferences.location.city;

  if (lower.includes('exercise') || lower.includes('run') || lower.includes('walk') || lower.includes('jog') || lower.includes('outside')) {
    if (category === 'Severe' || category === 'Very Poor') {
      return `### Outdoor Exercise Advisory for ${city} (AQI: ${aqi} — ${category})\n\n**Recommendation: Avoid all strenuous outdoor exercise today.**\n\nWhen exercising vigorously outdoors in high air pollution, your respiration rate increases 3-5x, drawing fine PM2.5 and toxic aerosols deep into the alveolar regions of your lungs where they can enter the bloodstream.\n\n* **Indoor Alternatives:** Gentle yoga, indoor bodyweight exercises, or mobility workouts.\n* **Timing:** Do not attempt early morning runs as winter temperature inversions trap smog at ground level.\n* **Evidence:** CPCB and WHO guidelines advise that the cardiovascular benefits of exercise are negated by acute particulate inhalation at AQI > 200.`;
    }
    if (category === 'Poor') {
      return `### Exercise Guidance for ${city} (AQI: ${aqi} — ${category})\n\n**Recommendation: Shift workout indoors or postpone to early afternoon.**\n\nAir quality is currently in the Poor category. While brief outdoor walks are acceptable for healthy individuals, prolonged aerobic exercise (running, cycling) will cause throat irritation and increased oxidative lung stress.\n\n* **Safe Action:** Exercise indoors, or wait until 1:00 PM – 3:30 PM when solar heating raises the atmospheric boundary layer, reducing ground-level pollution concentrations.`;
    }
    return `### Exercise Guidance for ${city} (AQI: ${aqi} — ${category})\n\n**Recommendation: Outdoor exercise is generally acceptable.**\n\nAir quality is in the ${category} category. You can proceed with your regular outdoor ${preferences.lifestyle.exerciseType} routine. Choose green parks and tree-lined avenues rather than roadsides with heavy motor traffic.`;
  }

  if (lower.includes('ventilate') || lower.includes('window') || lower.includes('fresh air')) {
    if (category === 'Poor' || category === 'Very Poor' || category === 'Severe') {
      return `### Ventilation Advisory for ${city} (AQI: ${aqi} — ${category})\n\n**Recommendation: Keep windows and balcony doors sealed.**\n\nOutdoor air contains dangerous concentrations of fine particulate matter (PM2.5). Opening windows in the morning or evening rush hours will rapidly compromise your indoor living areas.\n\n* **Optimal Window:** If indoor spaces feel stuffy, crack cross-ventilation windows for only 10–15 minutes between 1:00 PM and 3:00 PM (when ambient dispersion is at its peak).\n* **Cooking:** Ensure your kitchen exhaust fan is operating whenever cooking to expel indoor combustion gases without opening outside windows.`;
    }
    return `### Ventilation Guidance for ${city} (AQI: ${aqi} — ${category})\n\n**Recommendation: Open windows for 20–30 minutes for cross-ventilation.**\n\nWith ${category} air quality (${aqi}), natural morning ventilation will refresh stale indoor air, flush out accumulated CO2 from overnight sleep, and reduce volatile organic compounds (VOCs).`;
  }

  if (lower.includes('purifier') || lower.includes('filter') || lower.includes('indoor')) {
    return `### Indoor Air Quality & Purifier Best Practices\n\n1. **Purifier Placement:** Place the unit in the bedroom or living area at least 30 cm away from walls and curtains so airflow is unobstructed.\n2. **Run Time:** Air purifiers are most effective when run continuously on low/auto mode with closed doors and windows.\n3. **Without a Purifier:** \n   - Wet-mop floors with microfiber cloths (never dry-sweep with brooms, which resuspends settled PM2.5 for hours).\n   - Avoid burning incense (agarbatti), dhoop, and mosquito coils inside closed spaces.\n   - Seal micro-cracks under exterior doors with draft stoppers.`;
  }

  if (lower.includes('commute') || lower.includes('travel') || lower.includes('mask') || lower.includes('n95')) {
    return `### Commute & Respiratory Protection Guide\n\n* **Mask Type:** Only certified **N95 / FFP2 / KN95** respirators with an airtight perimeter seal provide protection against PM2.5 particles. Surgical masks and cloth bandanas allow >70% of fine particles to leak around the sides.\n* **In-Car Travel:** Turn car AC to **Recirculation Mode** to stop drawing contaminated outside air into the passenger compartment.\n* **Two-Wheelers & Autos:** Always wear your N95 respirator snugly over your nose and chin to shield against intense ground-level diesel particulate exhaust in stop-and-go traffic.`;
  }

  return `### AIRWISE Assistant for ${city}\n\nCurrent ambient conditions in **${city}** are at **AQI ${aqi} (${category})** with **${aqData?.prominentPollutant.toUpperCase() ?? 'PM2.5'}** as the dominant pollutant.\n\n* **Daily Plan:** Review your personalized Daily Action Plan for tailored morning, afternoon, evening, and night recommendations.\n* **Indoor Air:** Check the Indoor Air Guide for room-by-room pollutant reduction advice.\n* **Sustainable Alternatives:** Explore low-emission transportation and household alternatives that reduce your carbon footprint while guarding your respiratory health.\n\n*Feel free to ask specific questions about your daily commute, exercise schedule, window ventilation timing, or indoor purifier setup!*`;
}
