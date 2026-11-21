import React, { useState } from 'react';
import { usePreferences, DEFAULT_PREFERENCES } from '../store/preferences.js';
import type { UserPreferences, CommuteMode } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import {
  Settings,
  MapPin,
  Clock,
  Car,
  Home,
  Save,
  RotateCcw,
  Check,
  LocateFixed,
} from 'lucide-react';
import { INDIAN_CITIES } from '../data/indian-cities.js';

/**
 * The Preferences page originally displayed 18 cities (Onboarding displayed 20).
 * To preserve the original UI options during this refactor, we filter the shared
 * directory to its original subset. The two excluded cities (Bhopal, Nagpur) are
 * available in Onboarding's city selection step.
 */
const PREFERENCES_EXCLUDED_CITIES = new Set(['Bhopal', 'Nagpur']);
const PREFERENCES_CITIES = INDIAN_CITIES.filter(c => !PREFERENCES_EXCLUDED_CITIES.has(c.city));

export const PreferencesPage: React.FC = () => {
  const { preferences, savePreferences, resetPreferences } = usePreferences();
  const [formData, setFormData] = useState<UserPreferences>(
    preferences || DEFAULT_PREFERENCES
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    savePreferences(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all saved preferences to default?')) {
      resetPreferences();
      setFormData(DEFAULT_PREFERENCES);
    }
  };

  const handleGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLoading(false);
        setFormData(prev => ({
          ...prev,
          location: {
            city: 'My Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        }));
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            <h1 className="text-2xl font-bold text-surface-900">
              Preferences & Household Setup
            </h1>
          </div>
          <p className="text-xs text-surface-500">
            Update your daily routine or location at any time. Changes immediately update your action plan.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Preferences Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Location Settings */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-surface-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Location Setting</span>
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeo}
              isLoading={geoLoading}
              leftIcon={<LocateFixed className="w-3.5 h-3.5 text-brand-600" />}
              className="text-xs"
            >
              Detect via GPS
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PREFERENCES_CITIES.map(c => {
              const isSelected = formData.location.city === c.city;
              return (
                <button
                  key={c.city}
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      location: { city: c.city, latitude: c.lat, longitude: c.lon },
                    }))
                  }
                  className={`p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                      : 'border-surface-200 hover:border-surface-300 bg-surface-50 text-surface-700'
                  }`}
                >
                  {c.city}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 2. Schedule Settings */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-surface-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>Waking & Sleeping Hours</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="wake" className="block text-xs font-semibold text-surface-700">
                Wake-up Time
              </label>
              <input
                id="wake"
                type="time"
                value={formData.schedule.wakeUpTime}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, wakeUpTime: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sleep" className="block text-xs font-semibold text-surface-700">
                Sleep Time
              </label>
              <input
                id="sleep"
                type="time"
                value={formData.schedule.sleepTime}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, sleepTime: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* 3. Commute Settings */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-surface-700 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-600" />
            <span>Commute Mode</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'metro', label: 'Metro Rail' },
              { id: 'bus', label: 'City Bus' },
              { id: 'car', label: 'Private Car' },
              { id: 'motorcycle', label: 'Two-Wheeler' },
              { id: 'auto_rickshaw', label: 'Auto Rickshaw' },
              { id: 'bicycle', label: 'Bicycle' },
              { id: 'walk', label: 'Walking' },
              { id: 'work_from_home', label: 'Remote / WFH' },
            ].map(m => {
              const isSelected = formData.lifestyle.commuteMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      lifestyle: { ...prev.lifestyle, commuteMode: m.id as CommuteMode },
                    }))
                  }
                  className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                      : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 4. Home & Filtration Setup */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-surface-700 flex items-center gap-2">
            <Home className="w-4 h-4 text-brand-600" />
            <span>Household Clean Air Infrastructure</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-surface-50">
              <span className="text-xs font-semibold text-surface-800">
                HEPA Air Purifier in Household
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    home: { ...prev.home, hasAirPurifier: !prev.home.hasAirPurifier },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.home.hasAirPurifier ? 'bg-brand-600 justify-end' : 'bg-surface-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-surface-50">
              <span className="text-xs font-semibold text-surface-800">
                Kitchen Exhaust Fan / Chimney Installed
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    home: { ...prev.home, hasExhaust: !prev.home.hasExhaust },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  formData.home.hasExhaust ? 'bg-brand-600 justify-end' : 'bg-surface-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="text-surface-500 hover:text-red-700"
          >
            Reset All Preferences
          </Button>

          <Button
            type="submit"
            size="md"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
