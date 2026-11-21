import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences, DEFAULT_PREFERENCES } from '../store/preferences.js';
import type { UserPreferences, CommuteMode, ExerciseType, ExerciseLocation, VentilationType } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import {
  Wind,
  MapPin,
  Clock,
  Car,
  Home,
  Heart,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  LocateFixed,
} from 'lucide-react';
import { INDIAN_CITIES } from '../data/indian-cities.js';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, savePreferences } = usePreferences();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserPreferences>(
    preferences || DEFAULT_PREFERENCES
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const totalSteps = 6;

  // Handle browser geolocation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLoading(false);
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({
          ...prev,
          location: {
            city: 'My Location',
            latitude,
            longitude,
          },
        }));
      },
      err => {
        setGeoLoading(false);
        setGeoError(
          err.code === 1
            ? 'Location permission denied. Please pick a city from the list below.'
            : 'Unable to determine location. Please select your nearest city.'
        );
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      savePreferences(formData);
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md mb-2">
          <Wind className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
          Welcome to AIRWISE
        </h1>
        <p className="text-sm text-surface-600 max-w-md mx-auto">
          Understand your air. Make better decisions. Breathe smarter.
          Personalize your daily guidance in under 2 minutes.
        </p>

        {/* Step Progress Bar */}
        <div className="pt-4 max-w-xs mx-auto">
          <div className="flex items-center justify-between text-xs text-surface-500 font-medium mb-1.5">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-surface-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / totalSteps) * 100}%` }}
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label="Onboarding progress"
              aria-valuetext={`Step ${step} of ${totalSteps}`}
            />
          </div>
        </div>
      </div>

      <Card padding="lg" className="shadow-md">
        {/* STEP 1: LOCATION SELECTION */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                <span>Select Your City or Locality</span>
              </h2>
              <p className="text-xs text-surface-500">
                Air quality models depend on geographic coordinates. We never store exact street addresses.
              </p>
            </div>

            {/* Geolocation Button */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestLocation}
                isLoading={geoLoading}
                leftIcon={<LocateFixed className="w-4 h-4 text-brand-600" />}
                className="w-full justify-center bg-brand-50/50 hover:bg-brand-50 border-brand-200 text-brand-900"
              >
                Use My Current Location (Browser GPS)
              </Button>
              {geoError && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  {geoError}
                </p>
              )}
            </div>

            <div className="relative flex items-center justify-center my-2">
              <span className="absolute bg-white px-2 text-xs text-surface-400">OR SELECT CITY</span>
              <div className="w-full border-t border-surface-200" />
            </div>

            {/* Indian City Radio Grid */}
            <fieldset className="space-y-2">
              <legend className="sr-only">Select your city</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto overscroll-contain pr-1">
                {INDIAN_CITIES.map(c => {
                  const isSelected = formData.location.city === c.city;
                  return (
                    <label
                      key={c.city}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative select-none block
                        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                        ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-950 font-semibold ring-1 ring-brand-600'
                            : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="citySelection"
                        value={c.city}
                        checked={isSelected}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            location: { city: c.city, latitude: c.lat, longitude: c.lon },
                          }))
                        }
                        className="sr-only"
                      />
                      <span className="text-sm block">{c.city}</span>
                      <span className="text-[10px] text-surface-500 block truncate">{c.state}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* STEP 2: SCHEDULE */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600" />
                <span>Daily Schedule & Routine</span>
              </h2>
              <p className="text-xs text-surface-500">
                Pollution levels fluctuate throughout the day. We organize your action plan around your waking and sleeping hours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="wakeTime" className="block text-xs font-semibold text-surface-700">
                  Typical Wake-up Time
                </label>
                <input
                  id="wakeTime"
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

              <div className="space-y-1.5">
                <label htmlFor="sleepTime" className="block text-xs font-semibold text-surface-700">
                  Typical Sleep Time
                </label>
                <input
                  id="sleepTime"
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

              <div className="space-y-1.5">
                <label htmlFor="workStart" className="block text-xs font-semibold text-surface-700">
                  Work / School Start (Optional)
                </label>
                <input
                  id="workStart"
                  type="time"
                  value={formData.schedule.workStartTime || '09:00'}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, workStartTime: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="workEnd" className="block text-xs font-semibold text-surface-700">
                  Work / School End (Optional)
                </label>
                <input
                  id="workEnd"
                  type="time"
                  value={formData.schedule.workEndTime || '18:00'}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, workEndTime: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMMUTE */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-600" />
                <span>Commute Method & Duration</span>
              </h2>
              <p className="text-xs text-surface-500">
                In-transit exposure varies drastically between open vehicles (bikes, autos) and filtered transit (metro, cars).
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="block text-xs font-semibold text-surface-700">
                Primary Commute Mode
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                    <label
                      key={m.id}
                      className={`p-3 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer relative select-none block
                        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                        ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                            : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="commuteMode"
                        value={m.id}
                        checked={isSelected}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            lifestyle: { ...prev.lifestyle, commuteMode: m.id as CommuteMode },
                          }))
                        }
                        className="sr-only"
                      />
                      <span>{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-surface-700">
                <label htmlFor="commuteDuration">Approximate One-Way Duration</label>
                <span className="text-brand-700 font-bold">
                  {formData.lifestyle.commuteDurationMinutes ?? 30} minutes
                </span>
              </div>
              <input
                id="commuteDuration"
                type="range"
                min="0"
                max="120"
                step="5"
                value={formData.lifestyle.commuteDurationMinutes ?? 30}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    lifestyle: {
                      ...prev.lifestyle,
                      commuteDurationMinutes: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full accent-brand-600"
              />
            </div>
          </div>
        )}

        {/* STEP 4: EXERCISE & OUTDOOR HABITS */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Wind className="w-5 h-5 text-brand-600" />
                <span>Physical Fitness & Outdoor Habits</span>
              </h2>
              <p className="text-xs text-surface-500">
                High-intensity breathing outdoors dramatically multiplies inhaled particulate dosage.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="block text-xs font-semibold text-surface-700">
                Primary Exercise Habit
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'walking', label: 'Walking / Brisk Walk' },
                  { id: 'running', label: 'Running / Jogging' },
                  { id: 'cycling', label: 'Cycling' },
                  { id: 'yoga', label: 'Yoga / Meditation' },
                  { id: 'gym', label: 'Gym / Weights' },
                  { id: 'sports', label: 'Outdoor Sports' },
                  { id: 'none', label: 'No Regular Routine' },
                ].map(ex => {
                  const isSelected = formData.lifestyle.exerciseType === ex.id;
                  return (
                    <label
                      key={ex.id}
                      className={`p-3 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer relative select-none block
                        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                        ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                            : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="exerciseType"
                        value={ex.id}
                        checked={isSelected}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            lifestyle: { ...prev.lifestyle, exerciseType: ex.id as ExerciseType },
                          }))
                        }
                        className="sr-only"
                      />
                      <span>{ex.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {formData.lifestyle.exerciseType !== 'none' && (
              <fieldset className="space-y-3">
                <legend className="block text-xs font-semibold text-surface-700">
                  Where Do You Usually Work Out?
                </legend>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'outdoor', label: 'Outdoors (Parks/Roads)' },
                    { id: 'indoor', label: 'Indoors (Home/Gym)' },
                    { id: 'both', label: 'Mixed / Flexible' },
                  ].map(loc => {
                    const isSelected = formData.lifestyle.exerciseLocation === loc.id;
                    return (
                      <label
                        key={loc.id}
                        className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer relative select-none block
                          has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                          ${
                            isSelected
                              ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                              : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="exerciseLocation"
                          value={loc.id}
                          checked={isSelected}
                          onChange={() =>
                            setFormData(prev => ({
                              ...prev,
                              lifestyle: {
                                ...prev.lifestyle,
                                exerciseLocation: loc.id as ExerciseLocation,
                              },
                            }))
                          }
                          className="sr-only"
                        />
                        <span>{loc.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {/* STEP 5: HOME ENVIRONMENT */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-brand-600" />
                <span>Household Air & Cooking Setup</span>
              </h2>
              <p className="text-xs text-surface-500">
                Helps tailor indoor ventilation windows and room-by-room air-cleaning recommendations.
              </p>
            </div>

            {/* Air Purifier Ownership */}
            <label className="flex items-center justify-between p-3.5 rounded-lg border border-surface-200 bg-surface-50 cursor-pointer transition-all select-none
              has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold text-surface-800 block">
                  Do you own a HEPA Air Purifier?
                </span>
                <span className="text-xs text-surface-500 block">
                  We adapt our advice if you rely on natural ventilation or DIY filtration hacks.
                </span>
              </div>
              <input
                type="checkbox"
                name="hasAirPurifier"
                checked={formData.home.hasAirPurifier}
                onChange={() =>
                  setFormData(prev => ({
                    ...prev,
                    home: { ...prev.home, hasAirPurifier: !prev.home.hasAirPurifier },
                  }))
                }
                className="sr-only"
              />
              <div
                aria-hidden="true"
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                  formData.home.hasAirPurifier ? 'bg-brand-600 justify-end' : 'bg-surface-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </label>

            {/* Kitchen Exhaust Fan */}
            <label className="flex items-center justify-between p-3.5 rounded-lg border border-surface-200 bg-surface-50 cursor-pointer transition-all select-none
              has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold text-surface-800 block">
                  Kitchen Exhaust Fan or Chimney
                </span>
                <span className="text-xs text-surface-500 block">
                  Cooking without exhaust contributes heavily to PM2.5 in living areas.
                </span>
              </div>
              <input
                type="checkbox"
                name="hasExhaust"
                checked={formData.home.hasExhaust}
                onChange={() =>
                  setFormData(prev => ({
                    ...prev,
                    home: { ...prev.home, hasExhaust: !prev.home.hasExhaust },
                  }))
                }
                className="sr-only"
              />
              <div
                aria-hidden="true"
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                  formData.home.hasExhaust ? 'bg-brand-600 justify-end' : 'bg-surface-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </label>

            {/* Ventilation Style */}
            <fieldset className="space-y-2">
              <legend className="block text-xs font-semibold text-surface-700">
                Primary Ventilation Habit
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'windows_open', label: 'Open Windows Daily' },
                  { id: 'ac_only', label: 'Closed / AC Only' },
                  { id: 'mixed', label: 'Mixed / Occasional Airing' },
                  { id: 'cooler', label: 'Evaporative Air Cooler' },
                ].map(v => {
                  const isSelected = formData.home.ventilationType === v.id;
                  return (
                    <label
                      key={v.id}
                      className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer relative select-none block
                        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                        ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-950 font-bold ring-1 ring-brand-600'
                            : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-surface-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="ventilationType"
                        value={v.id}
                        checked={isSelected}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            home: { ...prev.home, ventilationType: v.id as VentilationType },
                          }))
                        }
                        className="sr-only"
                      />
                      <span>{v.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* STEP 6: SENSITIVE MEMBERS (VOLUNTARY) */}
        {step === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-600" />
                <span>Household Sensitivity (Optional)</span>
              </h2>
              <p className="text-xs text-surface-500">
                Vulnerable airways require conservative thresholds. We do NOT ask for medical diagnoses or personal medical histories.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Household Sensitivity Options</legend>
              {[
                {
                  key: 'hasChildren',
                  label: 'Children in household (Under 12 years)',
                  desc: 'Children breathe faster per unit body weight and are closer to ground-level road exhaust.',
                },
                {
                  key: 'hasElderly',
                  label: 'Seniors / Elderly members (65+ years)',
                  desc: 'Higher cardiovascular vulnerability during prolonged particulate exposure.',
                },
                {
                  key: 'hasSensitiveMembers',
                  label: 'Members with asthma, bronchitis, or dust allergies',
                  desc: 'Provides earlier warning alerts before ambient particulate levels trigger bronchospasms.',
                },
              ].map(item => {
                const key = item.key as keyof NonNullable<UserPreferences['sensitivity']>;
                const isChecked = formData.sensitivity?.[key] || false;
                return (
                  <label
                    key={item.key}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none block
                      has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1
                      ${
                        isChecked
                          ? 'border-brand-600 bg-brand-50/70 text-brand-950 ring-1 ring-brand-600'
                          : 'border-surface-200 hover:border-surface-300 bg-surface-50 text-surface-700'
                      }`}
                  >
                    <input
                      type="checkbox"
                      name={item.key}
                      checked={isChecked}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          sensitivity: {
                            hasChildren: prev.sensitivity?.hasChildren || false,
                            hasElderly: prev.sensitivity?.hasElderly || false,
                            hasSensitiveMembers: prev.sensitivity?.hasSensitiveMembers || false,
                            [key]: !isChecked,
                          },
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      aria-hidden="true"
                      className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 border shrink-0 ${
                        isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold block">{item.label}</span>
                      <span className="text-xs text-surface-500 block">{item.desc}</span>
                    </div>
                  </label>
                );
              })}
            </fieldset>

            <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 flex items-center gap-2 text-xs text-surface-500">
              <Shield className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                Privacy Guarantee: All preferences are kept strictly in your local browser storage and never transmitted to external marketing databases.
              </span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-surface-200 mt-6">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={handleBack}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            size="md"
            onClick={handleNext}
            rightIcon={step === totalSteps ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          >
            {step === totalSteps ? 'Generate My Action Plan' : 'Continue'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
