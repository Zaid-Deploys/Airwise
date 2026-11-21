import React from 'react';
import type { SustainableAlternative } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import { ArrowRight, ShieldAlert, ShieldCheck, Leaf, Coins, Check } from 'lucide-react';

interface AlternativeCardProps {
  alternative: SustainableAlternative;
}

export const AlternativeCard: React.FC<AlternativeCardProps> = ({ alternative }) => {
  return (
    <Card className="space-y-4 hover:border-brand-300 transition-colors">
      {/* Current Behavior vs Suggested Alternative Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-surface-50 border border-surface-200">
        <div className="space-y-0.5 flex-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400">
            Current Practice
          </span>
          <p className="text-sm font-medium text-surface-700">
            {alternative.currentBehavior}
          </p>
        </div>

        <div className="hidden sm:flex text-surface-400 px-2">
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="space-y-0.5 flex-1 bg-brand-50/70 p-2.5 rounded-md border border-brand-200/80">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-700 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Recommended Sustainable Alternative
          </span>
          <p className="text-sm font-bold text-brand-950">
            {alternative.suggestedAlternative}
          </p>
        </div>
      </div>

      {/* Critical Safety Notice if present (e.g. Do not cycle in severe AQI) */}
      {alternative.safetyNote && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-900">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold">Health Priority Rule: </span>
            <span>{alternative.safetyNote}</span>
          </div>
        </div>
      )}

      {/* Three-Column Impact Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* 1. Personal Exposure Reduction */}
        <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 space-y-1">
          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Personal Exposure Impact</span>
          </span>
          <p className="text-emerald-800 leading-relaxed">{alternative.exposureImpact}</p>
        </div>

        {/* 2. Emissions Reduction */}
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3 space-y-1">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            <span>Emissions & Carbon Impact</span>
          </span>
          <p className="text-blue-800 leading-relaxed">{alternative.emissionImpact}</p>
        </div>

        {/* 3. Cost & Co-Benefits */}
        <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3 space-y-1">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
            <span>Financial & Practical Benefit</span>
          </span>
          <p className="text-amber-800 leading-relaxed">{alternative.otherBenefits}</p>
        </div>
      </div>

      {/* Practical Considerations */}
      <div className="text-[11px] text-surface-500 bg-surface-50 rounded px-3 py-1.5 border border-surface-100">
        <span className="font-semibold text-surface-700">Implementation Note: </span>
        <span>{alternative.practicalConsideration}</span>
      </div>
    </Card>
  );
};
