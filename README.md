# AIRWISE — Urban Air Quality Assistant

> **"Understand your air. Make better decisions. Breathe smarter."**

AIRWISE is an air-quality decision-support application using CPCB breakpoint calculations and publicly documented health guidance, with model-derived environmental estimates, built for **PromptWars Virtual — Main Challenge 06**.

Designed specifically for families and communities in polluted urban centres (with India as the primary target market), AIRWISE bridges the gap between raw environmental sensor numbers and practical, evidence-informed daily decisions.

---

## 🌟 Key Product Capabilities

### 1. Authentic CPCB NAQI Intelligence
- Implements the **Indian National Air Quality Index (NAQI)** calculation methodology published by the Central Pollution Control Board (CPCB, 2014) applied to atmospheric model estimates.
- Uses the **maximum operator rule** across 8 criteria pollutants ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$, $\text{NH}_3$, $\text{Pb}$) to surface the true *Prominent Pollutant* without statistical dilution.
- Complete 24-hour hourly forecast powered by the Copernicus Atmosphere Monitoring Service (CAMS) global atmospheric model.

### 2. Personalized Daily Air Action Plan
- The flagship experience: organizes your day into **Morning, Afternoon, Evening, and Night** actionable guidance cards.
- Directly tailored to your **schedule** (waking, sleep, work hours), **transit mode** (metro, car, motorcycle, auto, bicycle, walk, WFH), and **exercise routine** (running, walking, cycling, yoga, gym).
- Every single recommendation card includes:
  1. **Specific Recommended Action**
  2. **Scientific Rationale ("Why it matters")**
  3. **Personalized Context**
  4. **Expected Benefit**
  5. **Practical Limitation / Trade-off**
  6. **Citations to CPCB, WHO, or MoHFW evidence**

### 3. Room-by-Room Indoor Air Quality Guide
- Dedicated guidance for **Living Room, Bedroom, Kitchen, and Home Office/Study**.
- Identifies indoor pollutant sources (LPG combustion, frying oil aerosols, incense/dhoop burning, dust mite dander, laser printer toner).
- Advises on optimal window ventilation windows (e.g. 1:00 PM – 3:30 PM atmospheric boundary layer lift) and strict sealing during night/morning inversions.
- **Strict Public Health Guardrail:** Explicitly warns against hazardous ozone-generating air ionizers.

### 4. Sustainable Alternatives (Safety-First Principle)
- Evaluates practical everyday alternatives: Solo driving vs AC Metro, vehicle idling cut-off, induction cooking vs biomass/unvented gas, composting vs leaf burning.
- **Crucial Distinction:** Clearly separates *Personal Exposure Reduction* from *Environmental Emissions Reduction*.
- **The Priority Rule:** Never recommends active outdoor commuting (like cycling or walking) during Severe/Poor smog merely to reduce emissions; human respiratory health strictly takes priority over personal carbon footprint.

### 5. Context-Aware AI Assistant ("Ask Airwise")
- Powered by **Google Gemini 3.8 Flash** (`gemini-3.8-flash`, configurable via `GEMINI_MODEL`) via the official `@google/genai` SDK.
- Answers practical user questions (e.g. *"Should my kids play outside today?"*, *"How do I improve air quality without a purifier?"*).
- **Hybrid Architecture:** Deterministic safety rules always govern core constraints. The LLM enriches and contextualizes wording. If offline, the app seamlessly provides deterministic expert answers.

---

## 🏗️ 4-Layer Hybrid AI Architecture

```
┌────────────────────────────────────────────────────────┐
│               LAYER 1: ENVIRONMENTAL DATA               │
│  - Open-Meteo Air Quality API (Copernicus CAMS Model)  │
│  - 15-Minute In-Memory TTL Cache & Provenance Metadata │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│         LAYER 2: DETERMINISTIC DECISION ENGINE          │
│  - CPCB India Breakpoint Calculation & Max Operator    │
│  - 50+ Hard Safety Rules (Prohibits outdoor cardio)    │
│  - Time-of-Day Schedule & Commute Adaptation           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            LAYER 3: GENAI PERSONALIZATION              │
│  - Google Gemini 3.8 Flash (@google/genai SDK)         │
│  - Structured JSON Output Schema Validation            │
│  - Prompt Injection Defense & Untrusted Input Sandbox  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│          LAYER 4: CLIENT PRESENTATION & STATE          │
│  - React 18, TypeScript, Tailwind CSS, Vite            │
│  - WCAG 2.2 AA Accessibility (Not color-dependent)     │
│  - Local Browser Persistence (Zero external data leak) │
└────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 7
- **Backend:** Node.js (v22+), Express 4, TypeScript, Helmet, CORS, Express Rate Limit, Zod 4
- **AI / LLM:** Google Gemini 3.8 Flash (`gemini-3.8-flash`, configurable via `GEMINI_MODEL`) with structured JSON schema
- **Data Source:** Open-Meteo Air Quality API (Copernicus CAMS atmospheric composition forecasts)
- **Testing:** Vitest, Testing Library, JSDOM, V8 coverage

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0 (tested on Node v22.23.1)
- npm >= 10.0.0

### Installation
```bash
# Clone the repository and enter directory
cd "AQI AGENT"

# Install all workspace dependencies
npm install
```

### Environment Configuration
Copy the `.env.example` file to create your local environment:
```bash
cp .env.example .env.local
```
Add your Google AI Studio key (optional, app features full deterministic fallback if omitted):
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

### Running Locally
```bash
# Run both client and server concurrently
npm run dev

# Or run separately:
npm run dev:server   # Starts Express API on http://localhost:3001
npm run dev:client   # Starts Vite React dev server on http://localhost:5173
```

Open `http://localhost:5173` in your browser to start the onboarding flow.

---

## 🧪 Testing & Verification

AIRWISE includes automated unit and integration tests covering the CPCB AQI calculator, deterministic rules, and API endpoints:

```bash
# Run all server test suites
npm run test

# Run unit tests only
npm run test:unit

# Type check both client and server
npm run typecheck

# Production build
npm run build
```

---

## 🛡️ Trust, Ethics & Safety

1. **Medical & Regulatory Disclaimer:** AIRWISE is an informational air-quality decision-support application and is not officially certified by government regulatory agencies. It provides environmental exposure guidance based on publicly documented health consensus (WHO, CPCB, MoHFW). It does not diagnose, prescribe, or replace medical practitioners.
2. **Data Transparency:** All displayed AQI data is explicitly labeled as *Copernicus CAMS atmospheric model estimates*, never falsely presented as direct ground station readings.
3. **Privacy First:** User schedule and sensitivity inputs are stored exclusively in the user's browser `localStorage` and never monetized or transmitted to third-party databases.
4. **Rate Limiting & Proxy Architecture:** Dual in-memory rate limiters protect upstream services: 60 requests/minute on the AQI route and 20 requests/minute shared across AI endpoints. Client-IP resolution adapts safely by environment (`trust proxy = false` in local development to block IP header spoofing, `trust proxy = 1` on Vercel to resolve users through edge proxies; blanket `trust proxy = true` is strictly rejected). Limits are enforced per running server instance rather than as a globally coordinated quota. Serverless cold starts or multi-instance scaling on Vercel can reset or fragment hit counters.

---

## 📜 Attribution & Licensing

- Air Quality Data: **Open-Meteo.com** under CC BY 4.0, utilizing Copernicus Atmosphere Monitoring Service (CAMS) data operated by ECMWF.
- AQI Calculation Standards: **Central Pollution Control Board (CPCB)**, Ministry of Environment, Forest and Climate Change, Government of India.
- Health Guidelines: **World Health Organization (WHO)** Global Air Quality Guidelines (2021).
- License: MIT License.
