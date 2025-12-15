import React from 'react';
import { HackathonData } from '../types';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const DayOfPhase: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-indigo-700">Phase 2: Day-Of Updates</h2>
      <p className="text-sm text-gray-500">Update your estimates with real-world data 24 hours before judging.</p>
      
      <div>
        <label className="block text-sm font-medium mb-1">Actual Check-ins</label>
        <input 
          type="number" 
          className="w-full p-2 border rounded"
          value={data.actualCheckIns || ''}
          onChange={e => onChange({...data, actualCheckIns: parseInt(e.target.value)})}
        />
        {data.actualCheckIns && (
          <p className="text-xs mt-1 text-gray-500">
            Est. Projects: {Math.ceil(data.actualCheckIns / 5)} 
            (Original est: {Math.ceil((data.estimatedCheckIns || 0)/5)})
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Confirmed Judges (RSVP'd)</label>
        <input 
          type="number" 
          className="w-full p-2 border rounded"
          value={data.confirmedJudges || ''}
          onChange={e => onChange({...data, confirmedJudges: parseInt(e.target.value)})}
        />
         {data.confirmedJudges && (
          <p className="text-xs mt-1 text-gray-500">
            Original List: {data.judges.length}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Venue/Table Changes Note</label>
        <textarea 
          className="w-full p-2 border rounded h-24"
          placeholder="e.g. Lost access to Room B, reduced tables by 10..."
          value={data.venueChangesNote}
          onChange={e => onChange({...data, venueChangesNote: e.target.value})}
        />
      </div>
    </div>
  );
};