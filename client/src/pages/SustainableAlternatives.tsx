import React, { useState, useEffect, useCallback } from 'react';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { SustainableAlternative } from '../types/index.js';
import { AlternativeCard } from '../components/sustainable/AlternativeCard.js';
import { Card } from '../components/ui/Card.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { Sparkles, Shield, Leaf } from 'lucide-react';

export const SustainableAlternativesPage: React.FC = () => {
  const { preferences } = usePreferences();
  const [alternatives, setAlternatives] = useState<SustainableAlternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlternatives = useCallback(async () => {
    if (!preferences) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.getSustainableAlternatives(preferences);
      setAlternatives(res);
    } catch (err) {
      console.error('Failed to load sustainable alternatives:', err);
      setError(err instanceof Error ? err.message : 'Could not generate sustainable alternatives');
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    fetchAlternatives();
  }, [fetchAlternatives]);

  if (!preferences) {
    return (
      <div className="py-12 text-center text-surface-500">
        Please complete onboarding first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div className="h-32 bg-surface-200 rounded-xl animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && alternatives.length === 0) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load sustainable alternatives"
          message={error}
          onRetry={() => fetchAlternatives()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
          <Sparkles className="w-4 h-4" />
          <span>Sustainable Living & Exposure Control</span>
        </div>
        <h1 className="text-2xl font-extrabold text-surface-900">
          Sustainable Alternatives for {preferences.location.city}
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed max-w-2xl">
          Reducing emissions and reducing your personal exposure to pollution are two different challenges. We evaluate everyday lifestyle alternatives with a transparent trade-off analysis.
        </p>

        {/* Core Philosophy Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-start gap-2 text-blue-900">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Rule 1: Health Takes Priority</span>
              <p className="text-surface-600 mt-0.5">
                We never recommend cycling or open walking commute during severe air pollution merely to save carbon emissions.
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-emerald-100 flex items-start gap-2 text-emerald-900">
            <Leaf className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Rule 2: Traceable Impact</span>
              <p className="text-surface-600 mt-0.5">
                Every suggested practice is backed by documented emissions factors or energy efficiency standards.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Alternatives Cards */}
      <div className="space-y-4">
        {alternatives.map(alt => (
          <AlternativeCard key={alt.id} alternative={alt} />
        ))}
      </div>
    </div>
  );
};
