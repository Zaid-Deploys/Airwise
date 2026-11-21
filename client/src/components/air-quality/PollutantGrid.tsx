import React from 'react';
import type { PollutantReading } from '../../types/index.js';
import { Card } from '../ui/Card.js';

interface PollutantGridProps {
  pollutants: PollutantReading[];
}

export const PollutantGrid: React.FC<PollutantGridProps> = ({ pollutants }) => {
  // Official CPCB 24-hr/8-hr satisfactory breakpoints for reference
  const safeThresholds: Record<string, string> = {
    pm25: 'CPCB 24h standard: 60 μg/m³ (WHO: 15 μg/m³)',
    pm10: 'CPCB 24h standard: 100 μg/m³ (WHO: 45 μg/m³)',
    no2: 'CPCB 24h standard: 80 μg/m³',
    so2: 'CPCB 24h standard: 80 μg/m³',
    co: 'CPCB 8h standard: 2.0 mg/m³',
    o3: 'CPCB 8h standard: 100 μg/m³',
    nh3: 'CPCB 24h standard: 400 μg/m³',
    pb: 'CPCB 24h standard: 1.0 μg/m³',
  };

  const getSubIndexColor = (subIndex: number | null) => {
    if (subIndex === null) return 'text-surface-600 bg-surface-100 border-surface-200';
    if (subIndex <= 50) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (subIndex <= 100) return 'text-green-700 bg-green-50 border-green-200';
    if (subIndex <= 200) return 'text-amber-800 bg-amber-50 border-amber-200';
    if (subIndex <= 300) return 'text-orange-800 bg-orange-50 border-orange-200';
    if (subIndex <= 400) return 'text-rose-800 bg-rose-50 border-rose-200';
    return 'text-red-950 bg-red-100 border-red-300 font-bold';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-900">
          Criteria Pollutants Breakdown
        </h3>
        <span className="text-xs text-surface-500 font-medium">
          Ranked by CPCB Sub-Index
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {pollutants.map(p => (
          <Card key={p.id} padding="sm" className="space-y-2 border-surface-200 hover:border-surface-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-surface-900 block uppercase tracking-wide">
                  {p.id === 'pm25' ? 'PM2.5' : p.id.toUpperCase()}
                </span>
                <span className="text-[11px] text-surface-500 line-clamp-1">
                  {p.name}
                </span>
              </div>

              {p.subIndex !== null && (
                <div
                  className={`px-2 py-0.5 rounded text-xs border font-semibold ${getSubIndexColor(p.subIndex)}`}
                  title="CPCB Sub-Index"
                >
                  Sub-Index: {p.subIndex}
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1 border-t border-surface-100">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-surface-900">{p.value}</span>
                <span className="text-xs font-medium text-surface-500">{p.unit}</span>
              </div>
              <span className="text-[11px] text-surface-400">
                {p.averagingPeriod} avg
              </span>
            </div>

            <div className="text-[10px] text-surface-500 bg-surface-50 rounded px-2 py-1">
              {safeThresholds[p.id] || 'Monitored under National Ambient Standards'}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
