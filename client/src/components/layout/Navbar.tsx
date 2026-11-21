import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Wind,
  LayoutDashboard,
  CalendarCheck,
  Activity,
  Home,
  Sparkles,
  MessageSquare,
  Settings,
  Menu,
  X,
  MapPin,
} from 'lucide-react';
import { usePreferences } from '../../store/preferences.js';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { preferences } = usePreferences();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/action-plan', label: 'Action Plan', icon: CalendarCheck },
    { to: '/air-quality', label: 'Air Detail', icon: Activity },
    { to: '/indoor', label: 'Indoor Guide', icon: Home },
    { to: '/sustainable', label: 'Alternatives', icon: Sparkles },
    { to: '/chat', label: 'Ask Airwise', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-surface-900 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Wind className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-surface-900">AIRWISE</span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-brand-700 -mt-1">
                Urban Air Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-800 font-semibold'
                        : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Location & Settings Bar */}
          <div className="hidden md:flex items-center gap-3">
            {preferences?.location && (
              <Link
                to="/preferences"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-medium transition-colors"
                title="Change city in Preferences"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
                <span>{preferences.location.city}</span>
              </Link>
            )}

            <Link
              to="/preferences"
              className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-600"
              title="Preferences & Settings"
              aria-label="Preferences"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {preferences?.location && (
              <span className="text-xs font-medium text-surface-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-600" />
                {preferences.location.city}
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-600"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-surface-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg animate-fade-in">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 font-semibold'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`
                }
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <div className="pt-3 border-t border-surface-200">
            <NavLink
              to="/preferences"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
              <span>Preferences & Household Setup</span>
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
};
