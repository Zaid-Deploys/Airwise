import React from 'react';
import type { IndoorRecommendation } from '../../types/index.js';
import { Card } from '../ui/Card.js';
import { ActionCard } from '../action-plan/ActionCard.js';
import { AlertCircle, Wind, ShieldCheck } from 'lucide-react';

interface RoomCardProps {
  roomData: IndoorRecommendation;
}

export const RoomCard: React.FC<RoomCardProps> = ({ roomData }) => {
  const roomTitles: Record<string, string> = {
    living_room: 'Living Room & Common Area',
    bedroom: 'Master Bedroom & Sleeping Quarters',
    kitchen: 'Kitchen & Cooking Zone',
    study: 'Home Office & Study Room',
  };

  return (
    <div className="space-y-4">
      {/* Room Overview Card */}
      <Card className="bg-gradient-to-r from-surface-50 to-white border-surface-200">
        <h3 className="text-lg font-bold text-surface-900 mb-2">
          {roomTitles[roomData.room] || roomData.room}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
          {/* Key In-Room Pollutant Sources */}
          <div className="bg-white rounded-lg p-3 border border-surface-200/80 space-y-1.5">
            <span className="font-bold text-surface-800 flex items-center gap-1.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
              <span>Primary Room Pollutants & Triggers:</span>
            </span>
            <ul className="list-disc pl-5 space-y-1 text-surface-600">
              {roomData.pollutantSources.map((src, i) => (
                <li key={i}>{src}</li>
              ))}
            </ul>
          </div>

          {/* Room Ventilation & Purifier Guidance */}
          <div className="space-y-2">
            <div className="bg-white rounded-lg p-3 border border-surface-200/80 space-y-1">
              <span className="font-bold text-surface-800 flex items-center gap-1.5 text-xs text-brand-800">
                <Wind className="w-4 h-4 text-brand-600" aria-hidden="true" />
                <span>Ventilation Strategy:</span>
              </span>
              <p className="text-surface-600 leading-relaxed">{roomData.ventilationAdvice}</p>
            </div>

            {roomData.purifierAdvice && (
              <div className="bg-white rounded-lg p-3 border border-surface-200/80 space-y-1">
                <span className="font-bold text-surface-800 flex items-center gap-1.5 text-xs text-blue-800">
                  <ShieldCheck className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <span>Filtration / Air Cleaning Advice:</span>
                </span>
                <p className="text-surface-600 leading-relaxed">{roomData.purifierAdvice}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Room Action Items */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
          Practical Room Actions
        </h4>
        <div className="space-y-3">
          {roomData.recommendations.map(rec => (
            <ActionCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      </div>
    </div>
  );
};
