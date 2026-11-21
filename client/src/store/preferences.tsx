/**
 * AIRWISE — User Preferences Store & Context
 * Persists user lifestyle, schedule, and location preferences safely in browser localStorage.
 */

import React, { createContext, useContext, useState } from 'react';
import type { UserPreferences } from '../types/index.js';

const STORAGE_KEY = 'airwise_preferences_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  location: {
    city: 'New Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
  },
  schedule: {
    wakeUpTime: '06:30',
    sleepTime: '22:30',
    workStartTime: '09:00',
    workEndTime: '18:00',
  },
  lifestyle: {
    commuteMode: 'metro',
    commuteDurationMinutes: 35,
    exerciseType: 'walking',
    exerciseLocation: 'outdoor',
    exerciseTime: 'morning',
    outdoorActivities: ['walking'],
  },
  home: {
    ventilationType: 'windows_open',
    hasAirPurifier: false,
    hasIndoorPlants: true,
    cookingFuel: 'gas',
    hasExhaust: true,
  },
  sensitivity: {
    hasChildren: false,
    hasElderly: false,
    hasSensitiveMembers: false,
  },
};

interface PreferencesContextType {
  preferences: UserPreferences | null;
  hasOnboarded: boolean;
  savePreferences: (prefs: UserPreferences) => void;
  resetPreferences: () => void;
  updateLocation: (city: string, latitude: number, longitude: number) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load preferences from localStorage', e);
    }
    return null;
  });

  const savePreferences = (newPrefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  };

  const resetPreferences = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(null);
  };

  const updateLocation = (city: string, latitude: number, longitude: number) => {
    if (!preferences) return;
    const updated: UserPreferences = {
      ...preferences,
      location: { city, latitude, longitude },
    };
    savePreferences(updated);
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        hasOnboarded: preferences !== null,
        savePreferences,
        resetPreferences,
        updateLocation,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesContextType {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
