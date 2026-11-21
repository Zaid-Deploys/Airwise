# AIRWISE — Known Limitations & Operational Boundaries

Transparent communication of technical and scientific constraints is critical when dealing with public environmental health.

---

## 1. Atmospheric Model vs Hyper-Local Sensor Observations
- **Gridded Resolution:** Open-Meteo utilizes ECMWF Copernicus CAMS Global atmospheric composition simulation at ~0.4° spatial resolution (~40–45 km grid size across India).
- **Macro vs Micro Climatology:** While CAMS captures regional winter smog blankets, stubble-burning plume transport, and temperature inversions with high fidelity, it cannot reflect hyper-local microclimates (such as standing 5 meters behind a diesel truck exhaust or a localized neighborhood trash fire).
- **Transparency Safeguard:** AIRWISE explicitly labels all readings as *Copernicus CAMS Model Estimates* so users understand the data foundation.

## 2. Indoor Air Quality Without Real IoT Sensors
- **Estimations vs Measured Truth:** Unless a user connects an authentic indoor air monitor (e.g. via local sensor protocols), AIRWISE cannot measure exact indoor PM2.5 concentrations in real time.
- **Safety Safeguard:** AIRWISE **never** invents fake indoor AQI numbers, CADR percentages, or misleading "indoor purification meters". Indoor guidance is strictly behavioural (wet-mopping, exhaust fan timing, sealing draft gaps).

## 3. Medical Scope & Regulatory Boundaries
- **Decision Support, Not Clinical Diagnosis:** AIRWISE is an environmental exposure decision assistant. It is **not** a licensed medical diagnostic device.
- **Vulnerable Groups:** Advice for individuals with asthma, COPD, or cardiovascular disease is aligned with published WHO and ICMR guidelines, but users experiencing acute shortness of breath or chest constriction are always instructed to seek immediate certified clinical care.

## 4. AI Hallucination & Safety Boundaries
- **No Free-Form Health Predictions:** Gemini 2.5 Flash operates within schema-constrained boundaries. Hard safety constraints (e.g., prohibiting outdoor running in Severe AQI) are enforced in TypeScript in Layer 2 before the LLM is ever called.
- **Deterministic Fallback:** The application operates with 100% functionality even when offline or without an active `GEMINI_API_KEY`.
