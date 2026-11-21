# AIRWISE — API Configuration & External Integration Verification Report
## PromptWars Virtual — Main Challenge 06: Urban Air Quality Assistant

This report provides the complete architecture inspection, environment inventory, external API audit, Gemini model migration, AQI data transparency updates, security verification, and local/production configuration guide for **AIRWISE**.

---

## 1. Project Architecture Inspected

AIRWISE is built as a **4-Layer Hybrid AI System** in a TypeScript monorepo with dedicated `client/` and `server/` workspaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LAYER 1: ENVIRONMENTAL DATA                     │
│  • Provider: Open-Meteo Air Quality API (Copernicus CAMS Model)        │
│  • Authentication: Unauthenticated (Free tier, 10,000 req/day quota)   │
│  • In-Memory TTL Cache: 15-minute expiration keyed by coordinates      │
│  • Provenance: Tagged as atmospheric model simulation (~45 km grid)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  LAYER 2: DETERMINISTIC DECISION ENGINE                │
│  • Indian CPCB National AQI (NAQI) linear breakpoint calculator        │
│  • Maximum Operator Rule across criteria pollutants (PM2.5, PM10, etc) │
│  • Strict public health invariants (prohibits outdoor cardio in smog)  │
│  • Schedule and multi-modal transit adaptation                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     LAYER 3: GENAI PERSONALIZATION                     │
│  • SDK: Official @google/genai Node.js SDK                             │
│  • Primary Model: gemini-3.8-flash (configurable via GEMINI_MODEL)     │
│  • Alternative: gemini-3.5-flash-lite (high throughput/low latency)    │
│  • Schema Validation: Structured JSON output via responseSchema        │
│  • Timeout Guard: Configurable 15s execution ceiling via Promise.race  │
│  • Fallback: 100% functional deterministic fallback when unconfigured │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   LAYER 4: CLIENT PRESENTATION & STATE                 │
│  • Single Page Application: React 18, Vite, Tailwind CSS               │
│  • Transparency: Explicit badges distinguishing model estimates        │
│  • Zero Secret Exposure: Frontend contains NO API keys or env vars     │
│  • Local Persistence: User preferences stored in browser localStorage  │
│  • Accessibility: WCAG 2.2 AA compliant (non-color-dependent alerts)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Environment-Variable Inventory

| Exact Variable Name | Purpose | Status | Consuming Workspace | Scope | Where Credential is Obtained | Needed in Dev? | Needed in Prod? | Incurs Charges? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Authenticates with Google Gemini API for GenAI plan personalization and chat | **Optional** (Deterministic fallback active if omitted) | `server` | **Server-side only (Secret)** | [Google AI Studio](https://aistudio.google.com/apikey) | Optional | Optional | Free tier available (15 RPM / 1M TPM) |
| `GEMINI_MODEL` | Specifies the Gemini model identifier (defaults to `gemini-3.8-flash`) | Optional | `server` | Server-side only | Google AI documentation | Optional | Optional | No |
| `GEMINI_TIMEOUT_MS` | Network timeout for Gemini API calls in ms (defaults to `15000`) | Optional | `server` | Server-side only | Internal configuration | Optional | Optional | No |
| `PORT` | Listening port for Express HTTP server (defaults to `3001`) | Optional | `server` | Server-side only | Local machine / hosting environment | Optional | Optional | No |
| `NODE_ENV` | Application runtime environment (`development`, `production`, `test`) | Optional | `server` | Server-side only | Node runtime | Optional | Optional | No |
| `CLIENT_ORIGIN` | Allowed origin for CORS validation (defaults to `http://localhost:5173`) | Optional | `server` | Server-side only | Frontend deployment URL | Optional | Optional | No |

---

## 3. Exact Gemini API Configuration & Model Migration

### Official Documentation Verification & Deprecation Schedule
- **`gemini-2.5-flash` Deprecation:** In official Google AI Studio documentation, `gemini-2.5-flash` is marked deprecated and can no longer be provisioned for new deployments. Effective **December 1, 2026**, Google will automatically reroute legacy requests targeting `gemini-2.5-flash` to `gemini-3.5-flash-lite`.
- **Selected Primary Model:** **`gemini-3.8-flash`**
  - Released September 2026 as Google's premier Flash-class model.
  - Engineered specifically for long-horizon agentic reasoning, structured JSON generation, and multi-step evaluation loops.
  - Features a 1M token context window and sub-second typical latency.
- **Evaluated Alternative:** **`gemini-3.5-flash-lite`**
  - High-throughput, ultra-low-latency model ideal for high-volume automated processing.
  - Retained as a documented option via `GEMINI_MODEL=gemini-3.5-flash-lite`.

### Technical SDK & Schema Compatibility
- **SDK Package:** `@google/genai` (official unified Google Gen AI SDK for Node.js).
- **Structured JSON Output:** `gemini-3.8-flash` fully supports `responseMimeType: 'application/json'` and `responseSchema` (with `Type.OBJECT`, `Type.ARRAY`, `Type.STRING`, and `enum` constraints).
- **Server Implementation:** [`server/src/ai/client.ts`](file:///home/zaidshaikh/AQI%20AGENT/server/src/ai/client.ts).
- **Environment Loader:** [`server/src/config/env.ts`](file:///home/zaidshaikh/AQI%20AGENT/server/src/config/env.ts) dynamically loads `GEMINI_MODEL`, defaulting to `gemini-3.8-flash`.
- **Timeout Protection:** Configured with `withTimeout(promise, env.GEMINI_TIMEOUT_MS, '...')` with a 15,000ms ceiling via `Promise.race`.
- **Failure Resilience:** Comprehensive `try/catch` handlers intercept timeouts, 429 rate limits, and network errors, immediately returning pre-calculated deterministic advisories without crashing.

---

## 4. AQI Provider Authentication & Data Transparency

### Authentication & Provider Details
- **Provider:** **Open-Meteo Air Quality API** (`https://air-quality-api.open-meteo.com/v1/air-quality`).
- **Authentication:** **None required (Unauthenticated)**. Open-Meteo's non-commercial tier requires no API key.
- **Data Source:** ECMWF Copernicus Atmosphere Monitoring Service (CAMS) Global Atmospheric Model.
- **Resolution:** ~0.4° gridded simulation (~45 km) covering all Indian geography.
- **Pollutants Ingested:** $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$, European AQI, and US AQI.
- **India CPCB Calculation:** AIRWISE calculates authentic Indian CPCB AQI locally via [`server/src/engine/aqi-calculator.ts`](file:///home/zaidshaikh/AQI%20AGENT/server/src/engine/aqi-calculator.ts) using official piecewise linear interpolation and the Maximum Operator Rule.
- **Rate Limits:** 10,000 requests/day, 5,000 requests/hour, 600 requests/minute.

### Rigorous UI Data Transparency Safeguards
To ensure users are never misled:
1. **Model Simulation vs Physical Observation:** The main AQI card ([`AqiDisplay.tsx`](file:///home/zaidshaikh/AQI%20AGENT/client/src/components/air-quality/AqiDisplay.tsx)) features an amber transparency badge:
   *`"Atmospheric Model Estimate • Not a Physical Ground Station Measurement"`*.
2. **Timestamp Labeling:** Labeled as `"Simulation Time: Today at HH:MM"` instead of ambiguous "Observed".
3. **Calculation Attribution:** Explicitly labeled as `"Calculated via CPCB NAQI Breakpoints"`.
4. **Forecast Card ([`HourlyForecast.tsx`](file:///home/zaidshaikh/AQI%20AGENT/client/src/components/air-quality/HourlyForecast.tsx)):** Labeled as `"CAMS Atmospheric Model Forecast • CPCB Breakpoint Method"`.
5. **Methodology Card ([`AirQualityDetail.tsx`](file:///home/zaidshaikh/AQI%20AGENT/client/src/pages/AirQualityDetail.tsx)):** Includes a dedicated explanation card comparing CAMS numerical atmospheric simulations (~45 km grid) with physical CAAQMS monitoring stations.

---

## 5. Other External API Requirements

- **Additional Services:** None.
- **Telemetry / Analytics:** None. Preferences remain in browser `localStorage`.
- **Paid Dependencies:** None.

---

## 6. Local Environment Setup Instructions

Follow these exact steps to configure your environment locally:

### Step 1: Create your local environment file
In the workspace root (`/home/zaidshaikh/AQI AGENT/`):
```bash
cp .env.example .env.local
```

### Step 2: Open and edit `.env.local`
Open `/home/zaidshaikh/AQI AGENT/.env.local` in your editor.

### Step 3: Insert your Gemini API Key
Locate the line:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
Replace `your_gemini_api_key_here` with your key from [Google AI Studio](https://aistudio.google.com/apikey).

*(Note: Do NOT commit `.env.local`. It is already excluded in `.gitignore`.)*

### Step 4: Run the Application
```bash
# Development mode (concurrent React dev server + Express backend)
npm run dev

# Or unified single-port production preview:
npm run preview
```
Visit `http://localhost:5173` (dev) or `http://localhost:3001` (preview).

---

## 7. Vercel Environment Setup Instructions

If you choose to deploy on Vercel:

### Step 1: Project Settings in Vercel Dashboard
1. Go to your Vercel Project Dashboard → **Settings** → **Environment Variables**.
2. Add the following variables:

| Variable Name | Value | Target Environment | Secret? |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Your Google AI Studio API Key)* | Production, Preview, Development | **Yes (Check "Encrypt")** |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Production, Preview, Development | No |
| `NODE_ENV` | `production` | Production | No |

### Step 2: Build & Output Settings
The repository includes [`vercel.json`](file:///home/zaidshaikh/AQI%20AGENT/vercel.json) and [`api/index.ts`](file:///home/zaidshaikh/AQI%20AGENT/api/index.ts):
- **Framework Preset:** Vite
- **Build Command:** `npm run build:client`
- **Output Directory:** `client/dist`
- **Serverless API Function:** `api/index.ts` automatically serves all `/api/*` routes.

---

## 8. Secret Security Audit

A comprehensive scan was conducted across the entire codebase and build artifacts:

| Audit Scope | Check Performed | Result | Status |
| :--- | :--- | :--- | :--- |
| `.gitignore` | Verifies `.env`, `.env.local`, `.env.production`, `.env.*.local` | Excluded on lines 7–10 of `.gitignore` | **PASS** |
| Frontend Source (`client/src`) | Grep for `VITE_`, `process.env`, `import.meta.env`, API key patterns | 0 matches found | **PASS** |
| Production Bundle (`client/dist`) | Automated regex scan for Google API key signature (`AIza...`) | 0 matches found | **PASS** |
| Backend Source (`server/src`) | Checks hardcoded API keys or credentials | 0 hardcoded secrets found | **PASS** |
| Backend Build (`server/dist`) | Automated regex scan for secrets | 0 matches found | **PASS** |
| API Responses (`/api/health`) | Verifies that `/api/health` exposes only a boolean `hasGeminiKey` | Key string is never serialized | **PASS** |
| Version Control History | Checks for historical Git commits containing secrets | Repository is not yet initialized with Git; no historical secret leaks exist | **PASS** |

---

## 9. Integration Verification Results

| Integration | Verification Type | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Open-Meteo Air Quality** | Automated Unit Tests + API Format | **PASS** | Verified CAMS ingestion, CPCB sub-index calculation, 15-min TTL caching, error/timeout handling. No API key required. |
| **Gemini AI Plan Generation** | Automated Unit Tests with Mocks | **PASS** | Verified JSON schema adherence with `gemini-3.8-flash`, timeout handling, empty response fallback, and rate-limit recovery. |
| **Gemini Conversational Chat** | Automated Unit Tests with Mocks | **PASS** | Verified context prompt formulation, length caps, and evidence-grounded fallback responses. |
| **Gemini Live API Key** | Live Remote Request | **NOT CONFIGURED** | Awaiting manual entry of `GEMINI_API_KEY` into `.env.local`. Deterministic fallback is active and fully functional. |
| **CORS & Security Headers** | Automated Route Integration Tests | **PASS** | Helmet headers enabled, CORS restricted by origin, payload capped at 20KB, rate limit active. |

---

## 10. Automated Test Results

The complete server test suite ran with Vitest:

```bash
npm run test
```

```
Test Files  5 passed (5)
     Tests  45 passed (45)
  Duration  1.42s

✓ tests/unit/aqi-calculator.test.ts (10 tests)
  ✓ calculates PM2.5 sub-index correctly across category breakpoints
  ✓ calculates PM10 sub-index correctly
  ✓ calculates CO sub-index in mg/m³
  ✓ caps values above maximum breakpoint at 500
  ✓ returns null for negative concentration or unknown pollutant
  ✓ classifies values into the official 6 CPCB categories (Good to Severe)
  ✓ selects the maximum sub-index as final AQI (Prominent Pollutant)
  ✓ identifies NO2 as prominent pollutant if its sub-index exceeds particulates
  ✓ enforces CPCB prerequisite: minimum 3 pollutants with at least one PM
  ✓ returns practical advisory text reflecting CPCB guidelines

✓ tests/unit/recommendation-engine.test.ts (8 tests)
  ✓ restricts outdoor exercise in Severe AQI and advises indoor workout
  ✓ permits outdoor workout in Good AQI
  ✓ recommends N95 respirator for open-vehicle commute in polluted air
  ✓ recommends air purifier scheduling when purifier is available
  ✓ provides wet-mopping fallback when no air purifier is owned
  ✓ generates room-by-room guidance with kitchen exhaust advice
  ✓ generates sustainable alternatives with safety-first priority
  ✓ formats daily action plan into Morning, Afternoon, Evening, Night

✓ tests/unit/open-meteo.test.ts (5 tests)
  ✓ correctly normalizes CAMS data and computes authentic CPCB NAQI
  ✓ utilizes in-memory TTL cache to prevent redundant HTTP requests
  ✓ handles missing pollutant parameters gracefully without throwing
  ✓ throws descriptive error when upstream API returns 502/500 error
  ✓ throws descriptive error on network timeout

✓ tests/unit/ai-client.test.ts (10 tests)
  ✓ reports isGeminiAvailable as false when key is not set
  ✓ returns deterministic base plan with fallback flags
  ✓ generates evidence-grounded deterministic chat fallback for exercise queries
  ✓ generates evidence-grounded deterministic chat fallback for ventilation queries
  ✓ successfully processes valid JSON schema response from Gemini mock
  ✓ safely falls back to base plan if Gemini returns empty text
  ✓ safely falls back to base plan if Gemini throws error or rate limit
  ✓ uses gemini-3.8-flash by default for plan generation and chat (Regression test)
  ✓ withTimeout resolves normally if promise settles within timeout
  ✓ withTimeout rejects with descriptive error if promise times out

✓ tests/integration/routes.test.ts (12 tests)
  ✓ air quality request validation (coordinates, city constraints)
  ✓ action plan schema validation (wake/sleep times, commute modes)
  ✓ chat request validation (size limits, prompt hygiene)
  ✓ indoor and sustainable endpoint validation
```

---

## 11. Build Results

All workspaces compile cleanly with zero errors:

- **TypeScript Typecheck:**
  ```bash
  npm run typecheck
  # airwise-client: tsc --noEmit (0 errors)
  # airwise-server: tsc --noEmit (0 errors)
  ```
- **Lint Check:**
  ```bash
  npm run lint
  # Passes across both workspaces (0 errors)
  ```
- **Production Build:**
  ```bash
  npm run build
  # Client: built in 3.63s (dist/assets/index-*.js: 278.28 kB)
  # Server: tsc compiled to dist/ (0 errors)
  ```

---

## 12. Remaining Manual Steps (Your Action Required)

The application code is complete and verified. The remaining actions for you are:

1. **Obtain your Gemini API Key:**
   Visit [Google AI Studio](https://aistudio.google.com/apikey) and click **"Create API key"**.
2. **Add Key to Local Environment:**
   - Copy `.env.example` to `.env.local` in `/home/zaidshaikh/AQI AGENT/`.
   - Set `GEMINI_API_KEY=<your-key>`.
3. **Verify Live Status:**
   - Run `npm run dev:server` (or `npm run preview`).
   - Query `http://localhost:3001/api/health` — it will confirm `"hasGeminiKey": true`.
4. **Deploy when ready:**
   - If deploying to Vercel, enter `GEMINI_API_KEY` in the Vercel dashboard settings under Environment Variables.

---

## 13. Outstanding Risks & Mitigation

| Potential Risk | Severity | Mitigation Implemented |
| :--- | :--- | :--- |
| **Gemini Rate Limit (429) or Quota Depletion** | Low | Deterministic fallback immediately returns authentic CPCB guidance; users experience zero interruption. |
| **Slow Upstream Network** | Low | Strict 15-second `withTimeout` ceiling prevents requests from hanging. |
| **Open-Meteo Upstream Outage** | Low | 15-minute in-memory TTL cache reduces external dependency; 10-second timeout returns clean 502 with structured error message. |
| **Accidental Secret Leakage** | Low | Secrets strictly restricted to server environment; client bundle audited with zero credentials; `.env.local` Git-ignored. |
