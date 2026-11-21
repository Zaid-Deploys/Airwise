import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`animate-pulse bg-surface-200 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm space-y-4 animate-pulse">
      <div className="h-6 bg-surface-200 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-surface-200 rounded w-full" />
        <div className="h-4 bg-surface-200 rounded w-5/6" />
        <div className="h-4 bg-surface-200 rounded w-4/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-8 bg-surface-200 rounded w-24" />
        <div className="h-8 bg-surface-200 rounded w-32" />
      </div>
    </div>
  );
};
