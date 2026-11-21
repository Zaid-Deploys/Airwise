# AIRWISE — Data Sources, Provenance & Environmental Integrity

Data integrity is foundational to AIRWISE. We do not invent sensor measurements, fabricate historical baselines, or silently conflate weather forecasts with real-time station measurements.

This document outlines the environmental data providers, averaging intervals, sub-index calculation standards, and attribution protocols.

---

## 1. Provider Evaluation & Decision Matrix

| Evaluation Criterion | Open-Meteo Air Quality (Selected) | WAQI / AQICN | OpenAQ (v3) | IQAir AirVisual |
| :--- | :--- | :--- | :--- | :--- |
| **India Coverage** | Continuous gridded coverage across India (~45 km) | Station-based (Metros & Tier 1/2) | Station-based | Station-based + community monitors |
| **Model vs Station** | **CAMS Atmospheric Model Simulation** | CAAQMS Ground Stations | CAAQMS Ground Stations | Ground stations + consumer sensors |
| **Pollutants Reported** | PM2.5, PM10, NO2, SO2, CO, O3, Dust, AOD | PM2.5, PM10, NO2, SO2, CO, O3 | PM2.5, PM10, NO2, SO2, CO, O3 (raw $\mu\text{g/m}^3$) | Aggregate AQI only on free tier |
| **Forecast Availability** | **Up to 7 days hourly forecasts** | 3-5 days daily min/max | None | Paid tier only |
| **CORS Support** | **Full open CORS enabled** | Restricted (requires proxy) | Restricted (requires proxy) | Restricted (requires proxy) |
| **API Key Needed?** | None for non-commercial tier | Free token | Free token | Free token |
| **Rate Limit** | 10,000 requests/day, 600/min | 1,000 requests/min | 60 requests/min | 500 requests/day (strict) |
| **Native CPCB AQI?** | No (Provides US & EU AQI) | No (Converts to US AQI) | None (Raw physical values) | No (Converts to US AQI) |
| **Licensing** | CC BY 4.0 | Non-commercial citation | Open data | Non-commercial with logo |

### Key Architectural Decision
No major free international API calculates the authentic **CPCB Indian National AQI**. WAQI and IQAir remap Indian station data onto the **US EPA AQI scale**, while Open-Meteo provides raw physical concentrations and European/US AQI.

**The AIRWISE Strategy:**
1. Ingest raw physical concentrations ($\mu\text{g/m}^3$ and $\text{mg/m}^3$) from Open-Meteo's CAMS model endpoint.
2. Calculate the authentic **CPCB National AQI** server-side using official CPCB linear breakpoints.
3. Explicitly declare every response as a **CAMS Atmospheric Model Estimate**, ensuring total transparency with users.

---

## 2. Indian CPCB NAQI Calculation Breakpoints

Source: Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India (2014).

$$I_i = I_{\text{LO}} + \frac{I_{\text{HI}} - I_{\text{LO}}}{B_{\text{HI}} - B_{\text{LO}}} \times (C - B_{\text{LO}})$$

| AQI Category | Range | $\text{PM}_{2.5}$ (24h) | $\text{PM}_{10}$ (24h) | $\text{NO}_2$ (24h) | $\text{SO}_2$ (24h) | $\text{CO}$ (8h, $\text{mg/m}^3$) | $\text{O}_3$ (8h) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Good** | 0 – 50 | 0 – 30 | 0 – 50 | 0 – 40 | 0 – 40 | 0 – 1.0 | 0 – 50 |
| **Satisfactory** | 51 – 100 | 31 – 60 | 51 – 100 | 41 – 80 | 41 – 80 | 1.1 – 2.0 | 51 – 100 |
| **Moderate** | 101 – 200 | 61 – 90 | 101 – 250 | 81 – 180 | 81 – 380 | 2.1 – 10.0 | 101 – 168 |
| **Poor** | 201 – 300 | 91 – 120 | 251 – 350 | 181 – 280 | 381 – 800 | 10.1 – 17.0 | 169 – 208 |
| **Very Poor** | 301 – 400 | 121 – 250 | 351 – 430 | 281 – 400 | 801 – 1600 | 17.1 – 34.0 | 209 – 748 |
| **Severe** | 401 – 500 | 250 – 380+ | 430 – 510+ | 400 – 520+ | 1600 – 2100+ | 34.0 – 46.0+ | 748 – 960+ |

### CPCB Validation Invariants
1. **Minimum Pollutants:** A minimum of 3 valid criteria pollutants must be present.
2. **Mandatory Particulate Rule:** At least one of the 3 pollutants must be $\text{PM}_{2.5}$ or $\text{PM}_{10}$.
3. **Maximum Operator:** $\text{AQI} = \max(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}}, I_{\text{SO2}}, I_{\text{CO}}, I_{\text{O3}})$. The pollutant yielding the maximum sub-index is designated the *Prominent Pollutant*.

---

## 3. Provenance Metadata Contract

Every environmental payload delivered by AIRWISE includes immutable provenance metadata:

```json
{
  "metadata": {
    "provider": "Open-Meteo",
    "dataType": "model_estimate",
    "observationTime": "2026-11-18T14:00:00Z",
    "retrievalTime": "2026-11-18T14:45:00Z",
    "freshnessStatus": "fresh",
    "modelSource": "Copernicus CAMS (ECMWF)",
    "attribution": "Air quality data by Open-Meteo.com using Copernicus CAMS atmospheric data"
  }
}
```

---

## 4. Freshness Classification
- **Fresh:** Observation age < 60 minutes.
- **Recent:** Observation age between 60 and 180 minutes.
- **Stale:** Observation age between 180 and 360 minutes (visual badge shown to user).
- **Expired:** Observation age > 360 minutes (triggers cache invalidation and background refresh).
