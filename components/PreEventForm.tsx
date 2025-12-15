import React, { useState } from 'react';
import { HackathonData, Organizer, OrganizerRoleType, Judge, DEFAULT_CRITERIA, Criterion } from '../types';
import { Plus, Trash2, HelpCircle, AlertTriangle } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
  onRunTest: () => void;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-2">
    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
    <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-800 rounded-md shadow-lg -translate-x-1/2 left-1/2">
      {text}
    </div>
  </div>
);

export const PreEventForm: React.FC<Props> = ({ data, onChange, onRunTest }) => {
  const [newJudge, setNewJudge] = useState<Partial<Judge>>({});
  const [newOrg, setNewOrg] = useState<Partial<Organizer>>({ role: OrganizerRoleType.DEVPOST });

  const updateField = (field: keyof HackathonData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addJudge = () => {
    if (newJudge.name && newJudge.phone) {
      updateField('judges', [...data.judges, { ...newJudge, id: Date.now().toString() } as Judge]);
      setNewJudge({ name: '', phone: '', email: '' });
    }
  };

  const removeJudge = (id: string) => {
    updateField('judges', data.judges.filter(j => j.id !== id));
  };

  const addOrg = () => {
    if (newOrg.name && newOrg.phone && newOrg.role) {
      updateField('organizers', [...data.organizers, { ...newOrg } as Organizer]);
      setNewOrg({ name: '', phone: '', email: '', role: OrganizerRoleType.DEVPOST });
    }
  };

  const removeOrg = (phone: string, role: string) => {
    updateField('organizers', data.organizers.filter(o => !(o.phone === phone && o.role === role)));
  };

  // Criteria Helpers
  const addCriteria = () => {
    updateField('criteria', [...data.criteria, { id: Date.now().toString(), name: 'New Criteria', description: '', scale: '1-3' }]);
  };

  const updateCriteria = (id: string, field: keyof Criterion, val: string) => {
    updateField('criteria', data.criteria.map(c => c.id === id ? { ...c, [field]: val } : c));
  };
  
  const removeCriteria = (id: string) => {
    updateField('criteria', data.criteria.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Basic Info */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">1. Event Basics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Event Name</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              value={data.eventName} 
              onChange={e => updateField('eventName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Est. Check-ins
              <Tooltip text="Hint: Use registrations / 2 (low-end), max capacity (high-end), or last year's data." />
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded" 
              value={data.estimatedCheckIns || ''} 
              onChange={e => updateField('estimatedCheckIns', parseInt(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* 2. Schedule */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">2. Schedule Timeline</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: 'Soft Submission Deadline', field: 'softDeadline', hint: '2 hours before judging start.' },
            { label: 'Hard Submission Deadline', field: 'hardDeadline', hint: '1 hour before judging start.' },
            { label: 'Judge Arrival', field: 'judgeArrival', hint: '30 min before debrief.' },
            { label: 'Judge Orientation/Debrief', field: 'judgeOrientation', hint: '1 hour before judging start.' },
            { label: 'Judging Start', field: 'judgingStart', hint: 'Start of active judging.' },
            { label: 'Judging End', field: 'judgingEnd', hint: 'End of active judging.' },
            { label: 'Deliberations', field: 'judgingDeliberations', hint: 'Between organizers, 1 hr buffer before closing.' },
            { label: 'Closing Ceremony Start', field: 'closingCeremony', hint: 'Min 30 mins, buffer with venue cleanup.' },
            { label: 'Venue Hard Cutoff', field: 'venueHardCutoff', hint: 'Absolute hard cutoff.' },
          ].map((item) => (
            <div key={item.field}>
              <label className="block text-sm font-medium mb-1">
                {item.label}
                <Tooltip text={item.hint} />
              </label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border rounded"
                value={data[item.field as keyof HackathonData] as string}
                onChange={e => updateField(item.field as keyof HackathonData, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 3. Logistics */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">3. Logistics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">
               Table Spaces
               <Tooltip text="If one table is split for 2 teams, count as 2 spaces. Number them individually." />
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded" 
              value={data.tableCount || ''} 
              onChange={e => updateField('tableCount', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
               Judges per Project (n)
               <Tooltip text="Number of times each team needs to be seen. Recommended: 3" />
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded" 
              value={data.judgesPerProject || ''} 
              onChange={e => updateField('judgesPerProject', parseInt(e.target.value))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <input type="checkbox" className="form-checkbox text-indigo-600" />
              <span>Did you print [{(Math.ceil((data.estimatedCheckIns || 0)/5) * 1.3).toFixed(0)}] table numbers?</span>
            </label>
            <label className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 mt-2">
              <input type="checkbox" className="form-checkbox text-indigo-600" />
              <span>Do you have a labeled map for judges?</span>
            </label>
          </div>
        </div>
      </section>

      {/* 4. Judges */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">4. Judges List</h2>
        <p className="text-sm text-gray-500 mb-4">Total Judges: {data.judges.length} (Est. effective: {Math.ceil(data.judges.length * 0.8)})</p>
        
        <div className="flex gap-2 mb-4 flex-col sm:flex-row">
          <input 
            placeholder="Name" 
            className="border p-2 rounded flex-1"
            value={newJudge.name || ''}
            onChange={e => setNewJudge({...newJudge, name: e.target.value})}
          />
          <input 
            placeholder="Phone" 
            className="border p-2 rounded flex-1"
            value={newJudge.phone || ''}
            onChange={e => setNewJudge({...newJudge, phone: e.target.value})}
          />
           <input 
            placeholder="Email (Opt)" 
            className="border p-2 rounded flex-1"
            value={newJudge.email || ''}
            onChange={e => setNewJudge({...newJudge, email: e.target.value})}
          />
          <button onClick={addJudge} className="bg-indigo-600 text-white p-2 rounded flex items-center justify-center">
            <Plus size={20} />
          </button>
        </div>

        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {data.judges.map(judge => (
            <li key={judge.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
              <span>{judge.name} - {judge.phone}</span>
              <button onClick={() => removeJudge(judge.id)} className="text-red-500"><Trash2 size={16}/></button>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Organizers */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">5. Organizers & Roles</h2>
        <div className="mb-4 space-y-2 bg-blue-50 p-4 rounded text-sm text-blue-800">
          <p>Assign distinct organizers to these critical roles. One organizer cannot hold multiple roles.</p>
        </div>
        
        <div className="flex gap-2 mb-4 flex-col md:flex-row items-end">
          <div className="w-full md:w-1/3">
             <label className="text-xs font-semibold text-gray-500">Name</label>
             <input className="border p-2 rounded w-full" value={newOrg.name || ''} onChange={e => setNewOrg({...newOrg, name: e.target.value})} />
          </div>
          <div className="w-full md:w-1/3">
             <label className="text-xs font-semibold text-gray-500">Phone</label>
             <input className="border p-2 rounded w-full" value={newOrg.phone || ''} onChange={e => setNewOrg({...newOrg, phone: e.target.value})} />
          </div>
          <div className="w-full md:w-1/3">
            <label className="text-xs font-semibold text-gray-500">Role</label>
            <select className="border p-2 rounded w-full" value={newOrg.role} onChange={e => setNewOrg({...newOrg, role: e.target.value as OrganizerRoleType})}>
              {Object.values(OrganizerRoleType).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button onClick={addOrg} className="bg-indigo-600 text-white p-2 rounded w-full md:w-auto flex justify-center">
            <Plus size={20} />
          </button>
        </div>

        <ul className="space-y-2">
          {data.organizers.map((org, idx) => (
            <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
              <div>
                <span className="font-bold block">{org.role}</span>
                <span className="text-gray-600">{org.name} ({org.phone})</span>
              </div>
              <button onClick={() => removeOrg(org.phone, org.role)} className="text-red-500"><Trash2 size={16}/></button>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Categories & Criteria */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">6. Categories & Criteria</h2>
        
        <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Sponsor Categories (comma separated)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              placeholder="e.g. Best Financial Hack, Best UI"
              value={data.sponsorCategories.join(', ')} 
              onChange={e => updateField('sponsorCategories', e.target.value.split(',').map(s => s.trim()))}
            />
        </div>

        <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Organizer Categories (comma separated)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              placeholder="e.g. Best Beginner, Sustainability"
              value={data.organizerCategories.join(', ')} 
              onChange={e => updateField('organizerCategories', e.target.value.split(',').map(s => s.trim()))}
            />
        </div>

        <h3 className="font-semibold text-gray-700 mb-2">Judging Criteria</h3>
        <div className="space-y-4">
          {data.criteria.map((crit) => (
            <div key={crit.id} className="border p-3 rounded bg-gray-50">
              <div className="flex justify-between mb-2">
                <input 
                  className="font-bold bg-transparent border-b border-gray-300 w-1/2" 
                  value={crit.name}
                  onChange={(e) => updateCriteria(crit.id, 'name', e.target.value)}
                />
                <button onClick={() => removeCriteria(crit.id)} className="text-red-500"><Trash2 size={16}/></button>
              </div>
              <textarea 
                className="w-full text-sm p-2 border rounded mb-2" 
                value={crit.description}
                onChange={(e) => updateCriteria(crit.id, 'description', e.target.value)}
              />
              <div className="flex items-center text-xs text-gray-500">
                <span>Scale: </span>
                <input 
                   className="ml-2 bg-transparent border-b w-16"
                   value={crit.scale}
                   onChange={(e) => updateCriteria(crit.id, 'scale', e.target.value)}
                />
              </div>
            </div>
          ))}
          <button onClick={addCriteria} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
            + Add Criterion
          </button>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-4xl mx-auto">
            <button 
                onClick={onRunTest}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
                <AlertTriangle className="w-5 h-5" />
                Run Stress Test
            </button>
        </div>
      </div>
    </div>
  );
};
