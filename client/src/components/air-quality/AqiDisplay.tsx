import React from 'react';
import type { AirQualityData } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { RefreshCw, Clock, Database, MapPin } from 'lucide-react';

interface AqiDisplayProps {
  data: AirQualityData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AqiDisplay: React.FC<AqiDisplayProps> = ({
  data,
  onRefresh,
  isRefreshing = false,
}) => {
  const { aqi, category, prominentPollutant, location, metadata } = data;

  // Background and border tone based on category
  const themeColors: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    Good: { bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-500/20' },
    Satisfactory: { bg: 'from-green-500/10 to-green-500/5', text: 'text-green-700', border: 'border-green-200', ring: 'ring-green-500/20' },
    Moderate: { bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-800', border: 'border-amber-200', ring: 'ring-amber-500/20' },
    Poor: { bg: 'from-orange-500/15 to-orange-500/5', text: 'text-orange-700', border: 'border-orange-300', ring: 'ring-orange-500/30' },
    'Very Poor': { bg: 'from-rose-500/15 to-rose-500/5', text: 'text-rose-700', border: 'border-rose-300', ring: 'ring-rose-500/30' },
    Severe: { bg: 'from-red-600/20 to-red-600/5', text: 'text-red-900', border: 'border-red-500', ring: 'ring-red-600/40' },
  };

  const theme = themeColors[category] ?? themeColors.Moderate;

  // Format observation time
  const formattedObsTime = new Date(metadata.observationTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className={`relative overflow-hidden border ${theme.border} bg-gradient-to-br ${theme.bg}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Location & Prominent Indicator */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500">
              <MapPin className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
              <span>{location.name}, {location.country}</span>
            </span>
            <span className="text-xs text-surface-400">•</span>
            <span className="text-xs text-surface-600 font-medium bg-surface-100 px-2 py-0.5 rounded border border-surface-200">
              Calculated via CPCB NAQI Breakpoints
            </span>
          </div>

          <div className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-1" aria-label={`Current AQI is ${aqi}`}>
              <span className={`text-6xl sm:text-7xl font-extrabold tracking-tight ${theme.text}`}>
                {aqi}
              </span>
              <span className="text-sm font-semibold text-surface-500">AQI</span>
            </div>

            <div className="space-y-1">
              <Badge category={category} size="lg" />
              <div className="text-xs text-surface-600 font-medium">
                Main Pollutant: <span className="font-bold uppercase text-surface-900">{prominentPollutant}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Provenance, Freshness, and Refresh */}
        <div className="w-full md:w-auto flex flex-col md:items-end justify-between gap-3 text-xs text-surface-500 border-t md:border-t-0 pt-4 md:pt-0 border-surface-200/60">
          <div className="space-y-1.5 md:text-right">
            <div className="flex items-center md:justify-end gap-1.5 font-medium text-surface-700">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simulation Time: Today at {formattedObsTime}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-surface-200 text-surface-700">
                {metadata.freshnessStatus}
              </span>
            </div>
            <div className="flex items-center md:justify-end gap-1.5 text-[11px] text-surface-500">
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copernicus CAMS Atmospheric Model (~45km grid)</span>
            </div>
            <div className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 md:text-right">
              Atmospheric Model Estimate • Not a Physical Ground Station Measurement
            </div>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="w-full md:w-auto bg-white/80 hover:bg-white"
            >
              Refresh Air Data
            </Button>
          )}
        </div>
      </div>

      {/* Trust Notice Banner */}
      <div className="mt-4 pt-3 border-t border-surface-200/60 flex flex-wrap items-center justify-between text-[11px] text-surface-600 gap-2">
        <span>
          <strong>Data Transparency:</strong> Raw pollutant concentrations are derived from the Copernicus CAMS global atmospheric model (ECMWF). The composite AQI is calculated locally using official Indian CPCB sub-index breakpoints; this is not an officially published CAAQMS ground-station reading.
        </span>
        <span className="font-medium text-surface-600 shrink-0">
          Data Source: Open-Meteo.com & Copernicus CAMS (CC BY 4.0)
        </span>
      </div>
    </Card>
  );
};
