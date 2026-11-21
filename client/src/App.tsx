import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PreferencesProvider, usePreferences } from './store/preferences.js';
import { Layout } from './components/layout/Layout.js';

// Pages
import { Onboarding } from './pages/Onboarding.js';
import { Dashboard } from './pages/Dashboard.js';
import { DailyActionPlanPage } from './pages/DailyActionPlan.js';
import { AirQualityDetailPage } from './pages/AirQualityDetail.js';
import { IndoorAirGuidePage } from './pages/IndoorAirGuide.js';
import { SustainableAlternativesPage } from './pages/SustainableAlternatives.js';
import { AskAirwisePage } from './pages/AskAirwise.js';
import { PreferencesPage } from './pages/Preferences.js';

const AppRoutes: React.FC = () => {
  const { hasOnboarded } = usePreferences();

  return (
    <Routes>
      <Route
        path="/"
        element={hasOnboarded ? <Navigate to="/dashboard" replace /> : <Onboarding />}
      />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/action-plan"
        element={
          <Layout>
            <DailyActionPlanPage />
          </Layout>
        }
      />
      <Route
        path="/air-quality"
        element={
          <Layout>
            <AirQualityDetailPage />
          </Layout>
        }
      />
      <Route
        path="/indoor"
        element={
          <Layout>
            <IndoorAirGuidePage />
          </Layout>
        }
      />
      <Route
        path="/sustainable"
        element={
          <Layout>
            <SustainableAlternativesPage />
          </Layout>
        }
      />
      <Route
        path="/chat"
        element={
          <Layout>
            <AskAirwisePage />
          </Layout>
        }
      />
      <Route
        path="/preferences"
        element={
          <Layout>
            <PreferencesPage />
          </Layout>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PreferencesProvider>
  );
};

export default App;
