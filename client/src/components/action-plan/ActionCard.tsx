import React, { useState } from 'react';
import type { Recommendation } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import {
  CheckCircle2,
  Circle,
  Shield,
  Leaf,
  Layers,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
} from 'lucide-react';

interface ActionCardProps {
  recommendation: Recommendation;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  recommendation,
  onToggleComplete,
}) => {
  const [isCompleted, setIsCompleted] = useState(recommendation.isCompleted || false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    if (onToggleComplete) {
      onToggleComplete(recommendation.id, nextState);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-300">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-surface-100 text-surface-700">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-surface-100 text-surface-600">Standard</span>;
    }
  };

  const getImpactBadge = (type: string) => {
    switch (type) {
      case 'exposure_reduction':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Shield className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>Exposure Reduction</span>
          </span>
        );
      case 'emission_reduction':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Leaf className="w-3 h-3 text-blue-600" aria-hidden="true" />
            <span>Emission Reduction</span>
          </span>
        );
      case 'both':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <Layers className="w-3 h-3 text-purple-600" aria-hidden="true" />
            <span>Dual Impact (Exposure + Emission)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-surface-700 bg-surface-100 px-2 py-0.5 rounded">
            <span>Health Benefit</span>
          </span>
        );
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isCompleted
          ? 'bg-surface-50 border-surface-200 opacity-75'
          : 'bg-white hover:border-brand-300'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Toggle Checkbox */}
        <button
          onClick={handleToggle}
          className="mt-0.5 text-surface-400 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-full transition-colors"
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-brand-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 space-y-2">
          {/* Header & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {getPriorityBadge(recommendation.priority)}
              {getImpactBadge(recommendation.impactType)}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-surface-400">
              {recommendation.category.replace('_', ' ')}
            </span>
          </div>

          {/* Action Title */}
          <h4
            className={`text-base font-semibold leading-snug ${
              isCompleted ? 'line-through text-surface-500' : 'text-surface-900'
            }`}
          >
            {recommendation.action}
          </h4>

          {/* Why it is recommended */}
          <p className="text-sm text-surface-600 leading-relaxed">
            {recommendation.reason}
          </p>

          {/* Context pill */}
          <div className="text-xs text-surface-500 bg-surface-50 rounded-lg p-2 border border-surface-100">
            <span className="font-semibold text-surface-700">Context: </span>
            <span>{recommendation.context}</span>
          </div>

          {/* Expandable Evidence & Trade-offs */}
          <div className="pt-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Hide impact & trade-off analysis' : 'Show impact, trade-off & evidence'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-surface-100 space-y-2.5 text-xs text-surface-600 animate-slide-up">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    Expected Benefit:
                  </span>
                  <p className="text-emerald-800">{recommendation.expectedBenefit}</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2.5 space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    Practical Trade-off / Limitation:
                  </span>
                  <p className="text-amber-800">{recommendation.limitation}</p>
                </div>

                {recommendation.source && (
                  <div className="flex items-center gap-1 text-[11px] text-surface-500 pt-1">
                    <BookOpen className="w-3.5 h-3.5 text-surface-400" />
                    <span>Evidence Source: {recommendation.source}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
