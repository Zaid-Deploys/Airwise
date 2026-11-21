# AIRWISE — Build in Public & Submission Narratives
## PromptWars Virtual — Main Challenge 06 (Urban Air Quality Assistant)

This document contains the complete **Build-in-Public Submission Package** for AIRWISE, including the official LinkedIn post draft, technical deep dive article / blog post, demonstration recording script, and prompt engineering rationale.

---

## 1. LinkedIn Post Draft (Ready to Publish)

```markdown
🌬️ Breathing shouldn't be a guessing game in urban India.

Today, I’m excited to share AIRWISE — a personalized urban air quality intelligence and daily action assistant built for PromptWars Virtual (Challenge 06: Urban Air Quality Assistant).

Most AQI apps stop at showing a frightening red number or a generic 500 AQI warning. But for a family living through North India’s winter smog inversion, knowing that the air is "Severe" doesn't answer the essential daily questions:
• "Can my kids play outside after school today?"
• "When is the atmospheric boundary layer high enough to safely open windows?"
• "Should I cycle to work to cut emissions, or will the particulate load do more harm to my lungs than the carbon savings justify?"

AIRWISE was engineered from the ground up to bridge this gap:

⚡ Key Architectural Highlights:
1. 🇮🇳 Authentic CPCB NAQI Calculation: Implements the official Central Pollution Control Board breakpoint formula with the strict Maximum Operator Rule across criteria pollutants (PM2.5, PM10, NO2, SO2, CO, O3) — no statistical dilution or foreign US EPA re-mapping.
2. 🛡️ Deterministic Safety Guardrails First: Hardcoded public health invariants (WHO/CPCB/ICMR) govern all exercise and vulnerable-member thresholds. We never let an LLM hallucinate health safety rules.
3. 🤖 Google Gemini 2.5 Flash Integration: Structured JSON schema personalization that turns raw hourly CAMS atmospheric models into a 4-part Daily Action Plan (Morning, Afternoon, Evening, Night).
4. 🏡 Room-by-Room Indoor Defense: Practical interventions for kitchens, bedrooms, and living rooms — with explicit warnings against dangerous ozone-generating ionizers.
5. ⚖️ Safety-First Sustainability: Distinguishes personal exposure reduction from emissions reduction. Health always supersedes carbon footprint during severe inversion episodes.
6. 🔒 100% Privacy-Preserving: User schedules, transit modes, and sensitivity profiles remain strictly inside browser localStorage. Zero PII collection.

Built entirely using Google Antigravity and agentic engineering workflows.

Check out the repository, run it locally, and let me know your thoughts!

🔗 Live Preview: [Your Live URL Here]
📂 GitHub Repository: [Your Repo URL Here]

#PromptWars #GenAI #GoogleGemini #Antigravity #AirQuality #CleanAir #WebDevelopment #React #TypeScript #BuildInPublic #Sustainability
```

---

## 2. Technical Deep-Dive / Blog Post Submission

### Title: Engineering AIRWISE: A 4-Layer Hybrid AI Assistant for Urban Air Pollution

#### Abstract
Urban air pollution in South Asia poses severe, recurring public health hazards during annual winter temperature inversions. While ambient sensor networks produce continuous time-series data, existing consumer applications merely present raw particulate concentrations or aggregate indices without actionable contextualization. This article details the design, architecture, and engineering principles behind **AIRWISE**, a hybrid AI decision assistant built for PromptWars Challenge 06.

---

### Section 1: The Problem — Sensor Abundance vs Action Scarcity
During severe winter smog episodes in cities like Delhi, Lahore, and Patna, air quality indices frequently surpass 400 (Severe). However, conventional interfaces fail users in three distinct ways:
1. **Index Misalignment:** International aggregators often map Indian CAAQMS ground data onto the US EPA Air Quality Index scale, which uses different concentration breakpoints and averaging windows, obscuring the authentic National AQI (NAQI) standard published by India's Central Pollution Control Board (CPCB).
2. **The "Green Paradox" Commute Dilemma:** Recommending active transport (such as cycling or walking) during high-smog days reduces vehicle emissions by ~150g CO₂e/km, but exponentially increases deep-lung particulate deposition in the commuter. Human exposure reduction must strictly supersede emissions mitigation in acute episodes.
3. **Indoor Cluelessness:** Ambient smog triggers indiscriminate sealing of homes, resulting in indoor accumulation of VOCs, carbon monoxide from unvented cooking, and particulate buildup from incense or frying oil aerosols.

---

### Section 2: The 4-Layer Hybrid Architecture

AIRWISE rejects the naive pattern of connecting an unconstrained LLM directly to a raw weather API. Instead, we implement a four-tier architecture:

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
│  - Google Gemini 2.5 Flash (@google/genai SDK)         │
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

#### Why Deterministic Rules Precede GenAI
In public health, deterministic invariants must remain immutable:
- In `Severe` AQI (> 400), outdoor cardiovascular exercise is **unconditionally unsafe**.
- Commuters traveling via open modes (motorcycle, bicycle, auto-rickshaw) **must wear N95/FFP2 respirators**.
- Ozone-generating air ionizers must be **explicitly warned against**.

By executing the deterministic rule engine in Layer 2, we establish rigid safety envelopes. Layer 3 (Google Gemini 2.5 Flash) is then tasked with **synthesizing context, explaining scientific rationale, and refining empathetic phrasing** within those strict constraints. If the LLM call times out or encounters network limits, the deterministic output is rendered without disruption.

---

### Section 3: Authentic CPCB NAQI Mathematics
The Indian National AQI computes a sub-index $I_i$ for each pollutant $i$ via piecewise linear interpolation:

$$I_i = I_{\text{LO}} + \left(\frac{I_{\text{HI}} - I_{\text{LO}}}{B_{\text{HI}} - B_{\text{LO}}}\right) \times (C_p - B_{\text{LO}})$$

Where:
- $C_p$: Current truncated pollutant concentration
- $B_{\text{HI}}, B_{\text{LO}}$: Category concentration breakpoints
- $I_{\text{HI}}, I_{\text{LO}}$: Corresponding index category bounds

The final composite index is computed using the **Maximum Operator Rule**:

$$\text{NAQI} = \max\left(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}}, I_{\text{SO2}}, I_{\text{CO}}, I_{\text{O3}}, I_{\text{NH3}}, I_{\text{Pb}}\right)$$

The pollutant yielding the highest sub-index is designated as the **Prominent Pollutant**.

---

### Section 4: Responsible GenAI Engineering with Google Gemini
The initial AIRWISE prototype targeted `gemini-2.5-flash` using the modern `@google/genai` Node.js SDK. Following official Google Developer API deprecation schedules and structured output audits, the production application was migrated to `gemini-3.8-flash` as the default model (dynamically configurable via `GEMINI_MODEL`, with `gemini-3.5-flash-lite` supported as an alternative).

Key engineering safeguards preserved across both phases:
1. **Schema Constraints:** Utilizing `responseMimeType: "application/json"` with formal `responseSchema` specifications guarantees predictable data serialization.
2. **Untrusted Input Sanitation:** User prompts, custom schedule labels, and geographical names are wrapped in strict input boundary delimiters to mitigate indirect prompt injection attacks.
3. **Structured Resilience:** If Gemini returns a non-conforming payload or encounters rate limiting, Zod schema validation intercepts the error and seamlessly falls back to pre-calculated deterministic advisories.

---

## 3. Video Demonstration Script (2–3 Minutes)

| Time | Screen / Visual | Narration Script |
| :--- | :--- | :--- |
| **0:00 - 0:25** | **Onboarding Wizard** | *"Welcome to AIRWISE. Millions in urban centres face severe winter smog every year, but numbers alone don't tell families how to live their day safely. AIRWISE begins with a quick, privacy-first onboarding flow where you choose your city, your daily routine — waking, commuting, exercise — and home details. All of this stays right inside your browser localStorage."* |
| **0:25 - 0:55** | **Dashboard & Live AQI** | *"Once configured, the Dashboard presents authentic CPCB National Air Quality Index values calculated directly from raw physical concentrations from the Copernicus atmospheric model. Notice our data transparency: we clearly state that these are atmospheric model estimates, not ground station sensors. The maximum operator rule identifies the prominent pollutant immediately without dilution."* |
| **0:55 - 1:30** | **Daily Action Plan** | *"Here is the flagship feature: The Personalized Daily Action Plan. Your day is divided into Morning, Afternoon, Evening, and Night. Because our user commutes via motorcycle and exercises early morning, AIRWISE automatically warns that morning inversion traps PM2.5 at ground level. It advises shifting to indoor bodyweight exercises and wearing an N95 on the bike. Every single card gives: the action, the scientific why, personal context, trade-offs, and citations to WHO or CPCB guidelines."* |
| **1:30 - 1:55** | **Indoor Guide & Alternatives** | *"In the Indoor Air Guide, users get room-by-room actions: optimal window opening windows between 1 PM and 3 PM when solar heating breaks the inversion layer, and strict warnings against ozone ionizers. In Sustainable Alternatives, our safety-first rule ensures we never tell users to cycle in Severe smog just to be 'green' — human lung safety strictly comes first."* |
| **1:55 - 2:30** | **Ask Airwise & Offline Fallback** | *"Finally, 'Ask Airwise' offers contextual AI assistance powered by Google Gemini 2.5 Flash with strict safety guardrails and deterministic offline fallback. Fast, accessible, and grounded in real science — AIRWISE helps you understand your air, make better decisions, and breathe smarter."* |

---

## 4. PromptWars Challenge 06 Alignment Checklist

- [x] **Severe winter smog context:** Modeled around northern Indian meteorological inversions and crop stubble transport.
- [x] **Personalized daily routines:** Morning/Afternoon/Evening/Night tailored to schedule and transit.
- [x] **Indoor air-quality improvement hacks:** Kitchen, bedroom, living room, study guidance with wet-mopping, ventilation timing, and purifier scheduling.
- [x] **Sustainable alternatives:** Solo driving vs AC metro, induction vs biomass, idling cutoff — with health-first prioritization.
- [x] **Direct impact explained:** Every recommendation features an "Expected Benefit" and "Limitation / Trade-off".
- [x] **Responsive & Accessible UI:** Tailwind CSS, mobile-first design, WCAG 2.2 AA non-color-dependent contrast.
- [x] **GenAI + Deterministic Hybrid:** Google Gemini 2.5 Flash with JSON schema enforcement and complete offline fallback.
- [x] **Production Grade:** Monorepo with TypeScript, 30 automated unit & integration tests, rate limiting, and Helmet security.
