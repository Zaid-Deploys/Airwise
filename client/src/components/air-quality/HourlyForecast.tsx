import React from 'react';
import type { HourlyForecastPoint } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import { Calendar } from 'lucide-react';

interface HourlyForecastProps {
  forecast: HourlyForecastPoint[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  if (!forecast || forecast.length === 0) return null;

  // Limit to next 24 hours for clean readability
  const next24 = forecast.slice(0, 24);

  const getAqiColor = (aqi: number | null) => {
    if (!aqi) return 'bg-surface-200 text-surface-700';
    if (aqi <= 50) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (aqi <= 100) return 'bg-green-100 text-green-800 border-green-300';
    if (aqi <= 200) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (aqi <= 300) return 'bg-orange-100 text-orange-900 border-orange-300';
    if (aqi <= 400) return 'bg-rose-100 text-rose-900 border-rose-300';
    return 'bg-red-200 text-red-950 font-bold border-red-500';
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" aria-hidden="true" />
          <h3 className="text-base font-semibold text-surface-900">
            24-Hour Air Quality Forecast
          </h3>
        </div>
        <span className="text-[11px] font-medium text-surface-600 bg-surface-100 px-2 py-0.5 rounded border border-surface-200">
          CAMS Atmospheric Model Forecast • CPCB Breakpoint Method
        </span>
      </div>

      {/* Horizontally scrollable timeline */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-end gap-2.5 min-w-[720px] pt-4">
          {next24.map((pt, i) => {
            const timeDate = new Date(pt.time);
            const hourFormatted = timeDate.toLocaleTimeString([], {
              hour: 'numeric',
              hour12: true,
            });
            const isToday = timeDate.getDate() === new Date().getDate();

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg bg-surface-50 border border-surface-200 text-center min-w-[64px]"
              >
                <span className="text-[11px] font-medium text-surface-500">
                  {hourFormatted}
                </span>

                <div
                  className={`w-full py-1.5 px-1 rounded-md text-xs font-bold border ${getAqiColor(
                    pt.aqi
                  )}`}
                >
                  {pt.aqi ?? '—'}
                </div>

                <div className="text-[10px] text-surface-500 leading-tight">
                  <span className="block font-medium">PM2.5</span>
                  <span>{pt.pm25 ? Math.round(pt.pm25) : '—'}</span>
                </div>

                {!isToday && (
                  <span className="text-[9px] uppercase tracking-wider text-surface-400 font-bold">
                    Tmrw
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-500">
        <span>
          Note: Multi-day hourly projections are derived from ECMWF Copernicus atmospheric composition simulations. Sub-indices calculated via Indian CPCB breakpoints.
        </span>
      </div>
    </Card>
  );
};
