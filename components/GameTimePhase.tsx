import React from 'react';
import { HackathonData } from '../types';
import { Clock, Calculator } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const GameTimePhase: React.FC<Props> = ({ data, onChange }) => {
  const projects = data.actualProjects || 0;
  const judges = data.actualJudgesShowed || 0;
  const demoTime = data.demoTimeMinutes || 0;
  const rounds = 3; // Fixed assumption per requirement

  let estimatedMinutes = 0;
  if (projects > 0 && judges > 0 && demoTime > 0) {
      // Formula: (Projects * Rounds * TimePerDemo) / Judges
      estimatedMinutes = Math.ceil((projects * rounds * demoTime) / judges);
  }

  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-indigo-700">Phase 3: Gametime</h2>
      <p className="text-sm text-gray-500">The moment of truth. Enter final numbers to estimate total judging duration.</p>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div>
            <label className="block text-sm font-medium mb-1">Actual Projects</label>
            <input 
            type="number" 
            className="w-full p-2 border rounded"
            value={data.actualProjects || ''}
            onChange={e => onChange({...data, actualProjects: parseInt(e.target.value)})}
            placeholder="0"
            />
        </div>

        <div>
            <label className="block text-sm font-medium mb-1">Demo Time (mins)</label>
            <input 
            type="number" 
            className="w-full p-2 border rounded"
            value={data.demoTimeMinutes || ''}
            onChange={e => onChange({...data, demoTimeMinutes: parseInt(e.target.value)})}
            placeholder="e.g. 5"
            />
        </div>

        <div>
            <label className="block text-sm font-medium mb-1">Actual Judges</label>
            <input 
            type="number" 
            className="w-full p-2 border rounded"
            value={data.actualJudgesShowed || ''}
            onChange={e => onChange({...data, actualJudgesShowed: parseInt(e.target.value)})}
            placeholder="0"
            />
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                <Clock size={24} />
            </div>
            <div>
                <h4 className="font-bold text-indigo-900">Estimated Total Time</h4>
                <p className="text-sm text-indigo-700">Assuming <span className="font-bold">3 rounds</span> per project.</p>
                {estimatedMinutes > 0 && (
                     <div className="text-xs text-indigo-400 mt-1 font-mono">
                        ({projects} projs × 3 × {demoTime}m) / {judges} judges
                     </div>
                )}
            </div>
        </div>
        
        <div className="text-right">
             {estimatedMinutes > 0 ? (
                 <div className="text-4xl font-black text-indigo-600 leading-none">
                     {timeString}
                 </div>
             ) : (
                 <div className="text-gray-400 italic text-sm">Enter metrics to calculate</div>
             )}
        </div>
      </div>
      
      {estimatedMinutes > 0 && (
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 flex gap-2 items-start border border-gray-200">
              <Calculator size={14} className="mt-0.5" />
              <div>
                  <span className="font-bold">Judgments Required:</span> {projects * rounds} total demos. 
                  Each judge will see approx <span className="font-bold">{Math.ceil((projects * rounds) / judges)} projects</span>.
              </div>
          </div>
      )}
    </div>
  );
};