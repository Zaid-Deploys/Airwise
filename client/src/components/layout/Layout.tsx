import React from 'react';
import { Navbar } from './Navbar.js';
import { HeartHandshake } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-surface-900">
      {/* Skip to Content for screen reader accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-surface-200 mt-12 py-8 text-surface-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-medium text-surface-700">
              <span className="font-bold text-surface-900">AIRWISE</span>
              <span>—</span>
              <span>Personalized Urban Air Intelligence & Daily Action Assistant</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-surface-500">
              <span>Methodology: CPCB NAQI (Calculated from CAMS Data)</span>
              <span>•</span>
              <span>Data: Open-Meteo & Copernicus CAMS</span>
              <span>•</span>
              <span>Engine: Hybrid Deterministic + Gemini AI</span>
            </div>
          </div>

          <div className="border-t border-surface-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-surface-400">
            <p className="flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
              <span>
                Health Advisory: AIRWISE provides environmental decision support based on public health consensus. It is not a substitute for certified medical advice.
              </span>
            </p>
            <p>© {new Date().getFullYear()} AIRWISE. Built for PromptWars Challenge 06.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
