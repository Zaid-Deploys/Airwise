import React, { useState, useEffect, useCallback } from 'react';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { IndoorRecommendation, RoomType } from '../types/index.js';
import { RoomCard } from '../components/indoor/RoomCard.js';
import { Card } from '../components/ui/Card.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import {
  Home,
  Sofa,
  Bed,
  UtensilsCrossed,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';

export const IndoorAirGuidePage: React.FC = () => {
  const { preferences } = usePreferences();
  const [recommendations, setRecommendations] = useState<IndoorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | 'all'>('all');

  const fetchIndoor = useCallback(async () => {
    if (!preferences) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.getIndoorRecommendations(preferences);
      setRecommendations(res);
    } catch (err) {
      console.error('Failed to load indoor recommendations:', err);
      setError(err instanceof Error ? err.message : 'Could not generate indoor air guide');
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    fetchIndoor();
  }, [fetchIndoor]);

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

  if (error && recommendations.length === 0) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load indoor guidance"
          message={error}
          onRetry={() => fetchIndoor()}
        />
      </div>
    );
  }

  const roomTabs = [
    { id: 'all', label: 'All Rooms', icon: Home },
    { id: 'living_room', label: 'Living Room', icon: Sofa },
    { id: 'bedroom', label: 'Bedroom', icon: Bed },
    { id: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
    { id: 'study', label: 'Study / Office', icon: Briefcase },
  ];

  const filteredRooms = selectedRoom === 'all'
    ? recommendations
    : recommendations.filter(r => r.room === selectedRoom);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Overview Banner */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-800">
          <Home className="w-4 h-4" />
          <span>Indoor Environmental Intelligence</span>
        </div>
        <h1 className="text-2xl font-extrabold text-surface-900">
          Indoor Air Quality & Household Protection Guide
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed max-w-2xl">
          During winter urban smog, indoor air can become 2x–5x more polluted than outside due to trapped cooking vapors, dust resuspension, and chemical fragrances. Protect your sanctuary with room-aware interventions.
        </p>

        {/* Safety Warning Against Ozone Air Purifiers */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-bold">Public Health Safety Rule: </span>
            <span>
              Never use "ionizers" or ozone-generating air cleaners in occupied rooms. Ozone is a potent lung irritant that damages mucosal tissue and worsens asthma. Rely exclusively on mechanical true-HEPA filtration and activated carbon.
            </span>
          </div>
        </div>
      </Card>

      {/* Room Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {roomTabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = selectedRoom === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedRoom(tab.id as typeof selectedRoom)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Room Guidance List */}
      <div className="space-y-8">
        {filteredRooms.map(r => (
          <RoomCard key={r.room} roomData={r} />
        ))}
      </div>
    </div>
  );
};
