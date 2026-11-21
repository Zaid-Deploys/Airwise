import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { AirQualityData, DailyActionPlan } from '../types/index.js';
import { AqiDisplay } from '../components/air-quality/AqiDisplay.js';
import { ActionCard } from '../components/action-plan/ActionCard.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import {
  CalendarCheck,
  Activity,
  Home,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, hasOnboarded } = usePreferences();

  const [aqData, setAqData] = useState<AirQualityData | null>(null);
  const [actionPlan, setActionPlan] = useState<DailyActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // If not onboarded, redirect to onboarding wizard
  useEffect(() => {
    if (!hasOnboarded) {
      navigate('/onboarding');
    }
  }, [hasOnboarded, navigate]);

  const loadDashboardData = async (isManualRefresh = false) => {
    if (!preferences) return;

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { latitude, longitude, city } = preferences.location;
      // 1. Fetch live air quality
      const aq = await api.getAirQuality(latitude, longitude, city);
      setAqData(aq);

      // 2. Fetch personalized action plan
      const plan = await api.getActionPlan(preferences);
      setActionPlan(plan);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load air quality data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (preferences) {
      loadDashboardData();
    }
  }, [preferences?.location?.city]);

  if (!preferences) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        <div className="h-44 bg-surface-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error && !aqData) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not connect to environmental services"
          message={error}
          onRetry={() => loadDashboardData()}
        />
      </div>
    );
  }

  // Extract top critical or high priority actions for today
  const allActions = actionPlan
    ? [...actionPlan.morning, ...actionPlan.afternoon, ...actionPlan.evening, ...actionPlan.night]
    : [];

  const topPriorityActions = allActions
    .filter(a => a.priority === 'critical' || a.priority === 'high')
    .slice(0, 3);

  const fallbackActions = topPriorityActions.length > 0 ? topPriorityActions : allActions.slice(0, 3);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* 1. PRIMARY LIVE AIR QUALITY INTELLIGENCE */}
      {aqData && (
        <AqiDisplay
          data={aqData}
          onRefresh={() => loadDashboardData(true)}
          isRefreshing={refreshing}
        />
      )}

      {/* 2. DAILY KEY MESSAGE BANNER */}
      {actionPlan && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            actionPlan.aqiCategory === 'Severe' || actionPlan.aqiCategory === 'Very Poor'
              ? 'bg-red-50 border-red-300 text-red-950'
              : actionPlan.aqiCategory === 'Poor'
              ? 'bg-orange-50 border-orange-200 text-orange-950'
              : 'bg-brand-50/70 border-brand-200 text-brand-950'
          }`}
        >
          {actionPlan.aqiCategory === 'Severe' || actionPlan.aqiCategory === 'Very Poor' ? (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : actionPlan.aqiCategory === 'Poor' ? (
            <Flame className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <h2 className="text-sm font-bold leading-tight">{actionPlan.keyMessage}</h2>
            <p className="text-xs opacity-90 leading-relaxed">{actionPlan.summary}</p>
          </div>
        </div>
      )}

      {/* 3. TODAY'S PRIORITY ACTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900">
              Today's Key Actions for {preferences.location.city}
            </h2>
            <p className="text-xs text-surface-500">
              Personalized based on your {preferences.lifestyle.commuteMode} commute and {preferences.lifestyle.exerciseType} routine.
            </p>
          </div>

          <Link
            to="/action-plan"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            <span>View Full Timeline ({allActions.length} actions)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {fallbackActions.map(rec => (
            <ActionCard key={rec.id} recommendation={rec} />
          ))}
        </div>

        <div className="sm:hidden text-center pt-2">
          <Link to="/action-plan">
            <Button variant="outline" size="sm" className="w-full">
              View All {allActions.length} Actions
            </Button>
          </Link>
        </div>
      </div>

      {/* 4. FEATURE QUICK LAUNCHPAD */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
          Explore Airwise Tools
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link to="/action-plan" className="block group">
            <Card className="p-4 h-full hover:border-brand-500 hover:shadow-md transition-all space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-surface-900 group-hover:text-brand-700">
                Daily Action Plan
              </h4>
              <p className="text-xs text-surface-500 leading-relaxed">
                Time-of-day morning, afternoon, evening, and night recommendations.
              </p>
            </Card>
          </Link>

          <Link to="/air-quality" className="block group">
            <Card className="p-4 h-full hover:border-brand-500 hover:shadow-md transition-all space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-surface-900 group-hover:text-brand-700">
                Pollutants & Forecast
              </h4>
              <p className="text-xs text-surface-500 leading-relaxed">
                Detailed PM2.5, PM10, gases breakdown and 24-hr hourly projection.
              </p>
            </Card>
          </Link>

          <Link to="/indoor" className="block group">
            <Card className="p-4 h-full hover:border-brand-500 hover:shadow-md transition-all space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-surface-900 group-hover:text-brand-700">
                Indoor Air Guide
              </h4>
              <p className="text-xs text-surface-500 leading-relaxed">
                Room-by-room guidance for bedroom, kitchen, living area, and home office.
              </p>
            </Card>
          </Link>

          <Link to="/sustainable" className="block group">
            <Card className="p-4 h-full hover:border-brand-500 hover:shadow-md transition-all space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-surface-900 group-hover:text-brand-700">
                Sustainable Choices
              </h4>
              <p className="text-xs text-surface-500 leading-relaxed">
                Practical alternatives that distinguish exposure safety from carbon emissions.
              </p>
            </Card>
          </Link>
        </div>
      </div>

      {/* 5. ASK THE AIRWISE AI CONTEXTUAL PROMPT */}
      <Card className="bg-gradient-to-r from-brand-900 to-brand-800 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-700 text-brand-200 text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Decision Assistant</span>
          </div>
          <h3 className="text-xl font-bold">Have a specific question about today's air?</h3>
          <p className="text-xs sm:text-sm text-brand-100/90 leading-relaxed">
            Ask questions like: "Should my kids play outside at 4 PM?", "How should I ventilate without an air purifier?", or "Is cycling safe for my commute today?"
          </p>
        </div>

        <Link to="/chat" className="shrink-0 w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-white text-brand-900 hover:bg-brand-50 shadow-md font-bold"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Ask Airwise AI
          </Button>
        </Link>
      </Card>
    </div>
  );
};
