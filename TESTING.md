# AIRWISE — Testing & Verification Report

---

## 1. Automated Test Suites

Testing is an integral part of the engineering foundation of AIRWISE, covering both unit calculations and API contracts.

### Commands
```bash
# Run all server tests (Vitest)
npm run test -w server

# Run unit tests only
npm run test:unit -w server

# Run integration tests only
npm run test:integration -w server

# Type check across all workspaces
npm run typecheck

# Full production build
npm run build
```

---

## 2. Test Execution Summary

```
 RUN  v2.1.9 /home/zaidshaikh/AQI AGENT/server

 ✓ tests/unit/aqi-calculator.test.ts (10 tests)
   ✓ Sub-Index Calculations
     ✓ calculates PM2.5 sub-index correctly across category breakpoints
     ✓ calculates PM10 sub-index correctly
     ✓ calculates CO sub-index in mg/m³
     ✓ caps values above maximum breakpoint at 500
     ✓ returns null for negative concentration or unknown pollutant
   ✓ AQI Category Classification
     ✓ classifies values into the official 6 CPCB categories (Good to Severe)
   ✓ Overall CPCB NAQI Calculation & Maximum Operator Rule
     ✓ selects the maximum sub-index as final AQI (Prominent Pollutant)
     ✓ identifies NO2 as prominent pollutant if its sub-index exceeds particulates
     ✓ enforces CPCB prerequisite: minimum 3 pollutants with at least one PM
   ✓ Health Advisory Mapping
     ✓ returns practical advisory text reflecting CPCB guidelines

 ✓ tests/unit/recommendation-engine.test.ts (8 tests)
   ✓ Daily Action Plan Safety Rules
     ✓ restricts outdoor exercise in Severe AQI and advises indoor workout
     ✓ permits outdoor workout in Good AQI
     ✓ recommends N95 respirator for open-vehicle commute in polluted air
     ✓ recommends air purifier scheduling when purifier is available
     ✓ provides wet-mopping fallback when no air purifier is owned
   ✓ Indoor Air Recommendations
     ✓ generates room-by-room guidance with kitchen exhaust advice
   ✓ Sustainable Alternatives & Health Priority Rule
     ✓ prioritizes respiratory health over emission reduction during high pollution
     ✓ clearly distinguishes exposure reduction from emission reduction

 ✓ tests/integration/routes.test.ts (12 tests)
   ✓ API Contract & Schema Validation Tests
     ✓ Air Quality Request Schema (4 tests)
     ✓ Action Plan Request Schema (3 tests)
     ✓ Chat Request Schema (3 tests)
     ✓ Indoor & Sustainable Request Schemas (2 tests)

Test Files  3 passed (3)
     Tests  30 passed (30)
  Duration  1.09s
```

---

## 3. Requirement Traceability Matrix (Internal Quality Gates)

| PromptWars Challenge Requirement | Implemented Feature | Code Location | Automated Test |
| :--- | :--- | :--- | :--- |
| **Severe winter smog solutions** | CPCB NAQI Engine & Inversion Advisories | `server/src/engine/aqi-calculator.ts` | `tests/unit/aqi-calculator.test.ts` |
| **Personalized daily routines** | Daily Action Plan (Morning, Afternoon, Evening, Night) | `server/src/engine/recommendation-engine.ts`, `client/src/pages/DailyActionPlan.tsx` | `tests/unit/recommendation-engine.test.ts` |
| **Indoor air quality hacks** | Room-by-room Indoor Guide (Living, Bed, Kitchen, Study) | `server/src/engine/recommendation-engine.ts`, `client/src/pages/IndoorAirGuide.tsx` | `tests/unit/recommendation-engine.test.ts` |
| **Sustainable alternatives** | Trade-off comparison separating exposure from emissions | `server/src/engine/recommendation-engine.ts`, `client/src/pages/SustainableAlternatives.tsx` | `tests/unit/recommendation-engine.test.ts` |
| **Contextual GenAI assistance** | Ask Airwise AI with Gemini 2.5 & deterministic fallback | `server/src/ai/client.ts`, `client/src/pages/AskAirwise.tsx` | `tests/integration/routes.test.ts` |
| **Responsive, accessible UI** | WCAG 2.2 AA design tokens, visible focus, skip links | `client/src/components/`, `client/src/index.css` | Manual keyboard & viewport checks |
