import React from 'react';
import { HackathonData } from '../types';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const GameTimePhase: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-indigo-700">Phase 3: Gametime</h2>
      <p className="text-sm text-gray-500">The moment of truth. Enter final numbers to adjust assignments dynamically (manual).</p>
      
      <div>
        <label className="block text-sm font-medium mb-1">Actual Submitted Projects</label>
        <input 
          type="number" 
          className="w-full p-2 border rounded"
          value={data.actualProjects || ''}
          onChange={e => onChange({...data, actualProjects: parseInt(e.target.value)})}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Demo Time (Minutes)</label>
        <input 
          type="number" 
          className="w-full p-2 border rounded"
          value={data.demoTimeMinutes || ''}
          onChange={e => onChange({...data, demoTimeMinutes: parseInt(e.target.value)})}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Actual Judges Present</label>
        <input 
          type="number" 
          className="w-full p-2 border rounded"
          value={data.actualJudgesShowed || ''}
          onChange={e => onChange({...data, actualJudgesShowed: parseInt(e.target.value)})}
        />
      </div>

      <div className="bg-gray-100 p-4 rounded text-sm text-gray-700">
        <h4 className="font-bold mb-2">Live Status</h4>
        <p>Projects: {data.actualProjects || '--'}</p>
        <p>Judges: {data.actualJudgesShowed || '--'}</p>
        <p>
           Load: {data.actualProjects && data.actualJudgesShowed 
            ? (data.actualProjects / data.actualJudgesShowed).toFixed(1) 
            : '--'} projects/judge (assuming 1 round)
        </p>
      </div>
    </div>
  );
};