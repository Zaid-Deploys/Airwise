import React, { useState, useEffect } from 'react';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { AirQualityData } from '../types/index.js';
import { AqiDisplay } from '../components/air-quality/AqiDisplay.js';
import { PollutantGrid } from '../components/air-quality/PollutantGrid.js';
import { HourlyForecast } from '../components/air-quality/HourlyForecast.js';
import { Card } from '../components/ui/Card.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { BookOpen, HelpCircle, Layers, Info } from 'lucide-react';

export const AirQualityDetailPage: React.FC = () => {
  const { preferences } = usePreferences();
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAqi = async (isManual = false) => {
    if (!preferences) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { latitude, longitude, city } = preferences.location;
      const res = await api.getAirQuality(latitude, longitude, city);
      setData(res);
    } catch (err) {
      console.error('Failed to load air quality detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch air quality detail');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAqi();
  }, [preferences?.location?.city]);

  if (!preferences) {
    return (
      <div className="py-12 text-center text-surface-500">
        Please complete onboarding first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <div className="h-44 bg-surface-200 rounded-xl animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load air quality detail"
          message={error}
          onRetry={() => fetchAqi()}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* 1. Main AQI Overview */}
      <AqiDisplay
        data={data}
        onRefresh={() => fetchAqi(true)}
        isRefreshing={refreshing}
      />

      {/* 2. Hourly Forecast */}
      {data.hourlyForecast && <HourlyForecast forecast={data.hourlyForecast} />}

      {/* 3. Criteria Pollutants Grid */}
      <PollutantGrid pollutants={data.pollutants} />

      {/* 4. Methodology Explainer: CPCB NAQI India Standard */}
      <Card className="p-6 space-y-4 bg-surface-50 border-surface-200">
        <div className="flex items-center gap-2 text-surface-900 font-bold text-base">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <span>Understanding the Indian National Air Quality Index (CPCB NAQI)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-surface-600 leading-relaxed">
          <div className="bg-white p-4 rounded-lg border border-surface-200 space-y-2">
            <h4 className="font-bold text-surface-800 flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>How Indian AQI Is Calculated</span>
            </h4>
            <p>
              The Indian National AQI tracks 8 criteria pollutants: <strong>PM2.5, PM10, NO2, SO2, CO, O3, NH3, and Lead (Pb)</strong>.
              For each monitored pollutant, a piecewise linear sub-index is calculated using official CPCB health breakpoints.
            </p>
            <p>
              Under CPCB methodology, the overall AQI is the <strong>maximum operator rule</strong>: the highest sub-index determines the final AQI score, and that pollutant is designated the <em>Prominent Pollutant</em>. Pollutants are never averaged.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-surface-200 space-y-2">
            <h4 className="font-bold text-surface-800 flex items-center gap-1.5 text-sm">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Why CPCB Differs From US EPA AQI</span>
            </h4>
            <p>
              International apps often default to US EPA AQI, leading to confusion. At lower concentrations (0–60 μg/m³ of PM2.5), the US EPA standard is stricter.
            </p>
            <p>
              However, during heavy winter smog episodes, the CPCB scale steepens significantly: PM2.5 over 120 μg/m³ is classified as <strong>Very Poor</strong> (301–400), and over 250 μg/m³ is <strong>Severe</strong> (401–500). AIRWISE implements the authentic Indian CPCB breakpoints directly.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-surface-200 space-y-2">
            <h4 className="font-bold text-surface-800 flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-sky-600" />
              <span>Model Estimates vs Ground Stations</span>
            </h4>
            <p>
              AIRWISE derives raw criteria pollutant concentrations from the <strong>Copernicus Atmosphere Monitoring Service (CAMS)</strong> global atmospheric simulation (~45 km grid) via Open-Meteo.
            </p>
            <p>
              Sub-indices and composite NAQI are calculated locally using official CPCB linear breakpoints. These are <em>meteorological model estimates</em>, not physical CAAQMS station publications.
            </p>
          </div>
        </div>

        {/* 6 Category Reference Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-200 text-surface-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">AQI Range</th>
                <th className="py-2 px-3">PM2.5 (24h)</th>
                <th className="py-2 px-3">PM10 (24h)</th>
                <th className="py-2 px-3">Associated Health Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-surface-700">
              <tr>
                <td className="py-2 px-3 font-bold text-emerald-800">Good</td>
                <td className="py-2 px-3">0 – 50</td>
                <td className="py-2 px-3">0 – 30 μg/m³</td>
                <td className="py-2 px-3">0 – 50 μg/m³</td>
                <td className="py-2 px-3">Minimal impact on health.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-green-800">Satisfactory</td>
                <td className="py-2 px-3">51 – 100</td>
                <td className="py-2 px-3">31 – 60 μg/m³</td>
                <td className="py-2 px-3">51 – 100 μg/m³</td>
                <td className="py-2 px-3">Minor breathing discomfort to sensitive people.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-amber-800">Moderate</td>
                <td className="py-2 px-3">101 – 200</td>
                <td className="py-2 px-3">61 – 90 μg/m³</td>
                <td className="py-2 px-3">101 – 250 μg/m³</td>
                <td className="py-2 px-3">Breathing discomfort to people with lung/heart disease, children, and older adults.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-orange-800">Poor</td>
                <td className="py-2 px-3">201 – 300</td>
                <td className="py-2 px-3">91 – 120 μg/m³</td>
                <td className="py-2 px-3">251 – 350 μg/m³</td>
                <td className="py-2 px-3">Breathing discomfort to most people on prolonged exposure.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-rose-800">Very Poor</td>
                <td className="py-2 px-3">301 – 400</td>
                <td className="py-2 px-3">121 – 250 μg/m³</td>
                <td className="py-2 px-3">351 – 430 μg/m³</td>
                <td className="py-2 px-3">Respiratory illness on prolonged exposure. Significant impact on heart/lung patients.</td>
              </tr>
              <tr className="bg-red-50/50">
                <td className="py-2 px-3 font-bold text-red-900">Severe</td>
                <td className="py-2 px-3 font-bold text-red-900">401 – 500+</td>
                <td className="py-2 px-3 font-bold">250+ μg/m³</td>
                <td className="py-2 px-3 font-bold">430+ μg/m³</td>
                <td className="py-2 px-3 font-bold text-red-900">Serious health impacts on healthy people; severe effects on those with existing diseases.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
