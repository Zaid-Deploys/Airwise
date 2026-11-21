import React, { useState, useEffect } from 'react';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { DailyActionPlan, Recommendation, TimeOfDay } from '../types/index.js';
import { ActionCard } from '../components/action-plan/ActionCard.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import {
  Sun,
  SunMedium,
  Sunset,
  Moon,
  RefreshCw,
  CheckCircle2,
  CalendarCheck,
  Brain,
} from 'lucide-react';

export const DailyActionPlanPage: React.FC = () => {
  const { preferences } = usePreferences();

  const [plan, setPlan] = useState<DailyActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | TimeOfDay>('all');
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const fetchPlan = async (isManual = false) => {
    if (!preferences) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getActionPlan(preferences);
      setPlan(res);
    } catch (err) {
      console.error('Failed to load action plan:', err);
      setError(err instanceof Error ? err.message : 'Could not generate action plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [preferences?.location?.city]);

  const handleToggleComplete = (id: string, isCompleted: boolean) => {
    setCompletedMap(prev => ({ ...prev, [id]: isCompleted }));
  };

  if (!preferences) {
    return (
      <div className="py-12 text-center text-surface-500">
        Please complete onboarding to generate your daily action plan.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div className="h-28 bg-surface-200 rounded-xl animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not generate action plan"
          message={error}
          onRetry={() => fetchPlan()}
        />
      </div>
    );
  }

  if (!plan) return null;

  // Flatten all items to compute stats
  const allItems: { time: TimeOfDay; item: Recommendation }[] = [
    ...plan.morning.map(item => ({ time: 'morning' as TimeOfDay, item })),
    ...plan.afternoon.map(item => ({ time: 'afternoon' as TimeOfDay, item })),
    ...plan.evening.map(item => ({ time: 'evening' as TimeOfDay, item })),
    ...plan.night.map(item => ({ time: 'night' as TimeOfDay, item })),
  ];

  const totalActions = allItems.length;
  const completedActions = allItems.filter(
    a => completedMap[a.item.id] ?? a.item.isCompleted
  ).length;

  const renderSection = (title: string, time: TimeOfDay, icon: React.ReactNode, items: Recommendation[]) => {
    if (items.length === 0) return null;
    if (activeTab !== 'all' && activeTab !== time) return null;

    return (
      <section className="space-y-3 pt-2" aria-labelledby={`sec-${time}`}>
        <div className="flex items-center gap-2 pb-1 border-b border-surface-200">
          <div className="text-brand-700">{icon}</div>
          <h3 id={`sec-${time}`} className="text-base font-bold text-surface-900">
            {title}
          </h3>
          <span className="text-xs font-semibold text-surface-500 bg-surface-100 px-2 py-0.5 rounded-full ml-auto">
            {items.length} {items.length === 1 ? 'Action' : 'Actions'}
          </span>
        </div>

        <div className="space-y-3">
          {items.map(rec => (
            <ActionCard
              key={rec.id}
              recommendation={{
                ...rec,
                isCompleted: completedMap[rec.id] ?? rec.isCompleted,
              }}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header Overview Card */}
      <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
              <CalendarCheck className="w-4 h-4" />
              <span>Today's Air Action Plan • {plan.date}</span>
              {plan.isAiGenerated ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 text-[10px] font-bold">
                  <Brain className="w-3 h-3 text-brand-700" />
                  Gemini Enhanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-200 text-surface-700 text-[10px] font-medium">
                  Deterministic Safety Engine
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-surface-900">
              Personalized Plan for {preferences.location.city}
            </h1>
            <p className="text-xs text-surface-600">
              Current Air Status: <span className="font-bold text-surface-800">{plan.currentAqi} AQI ({plan.aqiCategory})</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlan(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-white hover:bg-brand-50"
          >
            Regenerate Plan
          </Button>
        </div>

        {/* Action Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-brand-200/60">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-surface-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              Daily Actions Completed: {completedActions} of {totalActions}
            </span>
            <span className="text-brand-800 font-bold">
              {Math.round((completedActions / (totalActions || 1)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-surface-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${(completedActions / (totalActions || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none" role="tablist">
        {[
          { id: 'all', label: 'Full Day' },
          { id: 'morning', label: 'Morning' },
          { id: 'afternoon', label: 'Afternoon' },
          { id: 'evening', label: 'Evening' },
          { id: 'night', label: 'Night' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4 Time-of-Day Sections */}
      <div className="space-y-8">
        {renderSection('Morning Routine & Commute', 'morning', <Sun className="w-5 h-5" />, plan.morning)}
        {renderSection('Afternoon Work & Ventilation', 'afternoon', <SunMedium className="w-5 h-5" />, plan.afternoon)}
        {renderSection('Evening Commute & Purification', 'evening', <Sunset className="w-5 h-5" />, plan.evening)}
        {renderSection('Night Sleep & Recovery', 'night', <Moon className="w-5 h-5" />, plan.night)}
      </div>
    </div>
  );
};
