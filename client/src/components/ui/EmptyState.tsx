import React from 'react';
import { Wind } from 'lucide-react';
import { Button } from './Button.js';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 px-4 max-w-md mx-auto ${className}`}>
      <div className="w-14 h-14 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4 text-surface-500">
        {icon || <Wind className="w-7 h-7" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 mb-6">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
};
