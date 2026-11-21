import React from 'react';
import type { AqiCategory } from '../../types/index.js';
import { CheckCircle2, AlertTriangle, AlertOctagon, Skull, ShieldCheck, Info } from 'lucide-react';

interface BadgeProps {
  category: AqiCategory;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  category,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  // Accessible styling combining distinct backgrounds, borders, text colors, and unique icons
  const configs: Record<
    AqiCategory,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    Good: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
      label: 'Good (0–50)',
    },
    Satisfactory: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />,
      label: 'Satisfactory (51–100)',
    },
    Moderate: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      icon: <Info className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
      label: 'Moderate (101–200)',
    },
    Poor: {
      bg: 'bg-orange-50',
      text: 'text-orange-900',
      border: 'border-orange-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />,
      label: 'Poor (201–300)',
    },
    'Very Poor': {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-400',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />,
      label: 'Very Poor (301–400)',
    },
    Severe: {
      bg: 'bg-red-100',
      text: 'text-red-950 font-bold',
      border: 'border-red-600',
      icon: <Skull className="w-3.5 h-3.5 text-red-700" aria-hidden="true" />,
      label: 'Severe (401–500+)',
    },
  };

  const conf = configs[category] || configs.Moderate;

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm sm:text-base px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${conf.bg} ${conf.text} ${conf.border} ${sizes[size]} ${className}`}
      role="status"
      aria-label={`Air Quality Category: ${category}`}
    >
      {showIcon && conf.icon}
      <span>{category}</span>
    </span>
  );
};
