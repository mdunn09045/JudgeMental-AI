import React, { useState } from 'react';
import { HackathonData, Organizer, OrganizerRoleType, Judge, DEFAULT_CRITERIA, Criterion } from '../types';
import { Plus, Trash2, HelpCircle, AlertTriangle, Edit2, X, Save, Download, Upload, Gavel, Tag, Image as ImageIcon } from 'lucide-react';

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
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);
  const [newOrgCat, setNewOrgCat] = useState('');
  const [newSponsorCat, setNewSponsorCat] = useState('');
  
  const updateField = (field: keyof HackathonData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // --- Data Management ---
  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `judgeplan-${data.eventName ? data.eventName.replace(/\s+/g, '-').toLowerCase() : 'backup'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              if (!text) return;
              
              const parsed = JSON.parse(text);
              // Basic structure check: must have judges array or projects array to be valid
              if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.judges) || Array.isArray(parsed.projects))) {
                  // Use setTimeout to ensure the file input UI event clears before blocking with confirm
                  setTimeout(() => {
                    if (window.confirm(`Restore data from "${file.name}"? This will overwrite ALL current data.`)) {
                        onChange(parsed);
                        alert("Data restored successfully.");
                    }
                  }, 50);
              } else {
                  alert("Invalid file format. Please upload a valid JudgePlan JSON export.");
              }
          } catch (err) {
              console.error(err);
              alert("Error parsing file.");
          }
      };
      reader.readAsText(file);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
  };


  const addJudge = () => {
    if (newJudge.name && newJudge.phone) {
      if (editingJudgeId) {
        updateField('judges', data.judges.map(j => j.id === editingJudgeId ? { ...newJudge, id: editingJudgeId } as Judge : j));
        setEditingJudgeId(null);
      } else {
        updateField('judges', [...data.judges, { ...newJudge, id: Date.now().toString() } as Judge]);
      }
      setNewJudge({ name: '', phone: '', email: '' });
    }
  };

  const startEditJudge = (judge: Judge) => {
    setNewJudge(judge);
    setEditingJudgeId(judge.id);
  };

  const cancelEditJudge = () => {
    setNewJudge({ name: '', phone: '', email: '' });
    setEditingJudgeId(null);
  };

  const removeJudge = (id: string) => {
    if (editingJudgeId === id) cancelEditJudge();
    updateField('judges', data.judges.filter(j => j.id !== id));
  };

  // Organizer Management
  const updateOrganizer = (index: number, field: keyof Organizer, value: string) => {
    const updated = [...data.organizers];
    updated[index] = { ...updated[index], [field]: value };
    updateField('organizers', updated);
  };

  const addEmptyOrganizer = () => {
     updateField('organizers', [...data.organizers, { name: '', phone: '', email: '', role: OrganizerRoleType.DEVPOST }]);
  };

  const removeOrganizer = (index: number) => {
    const updated = data.organizers.filter((_, i) => i !== index);
    updateField('organizers', updated);
  };

  // Criteria Helpers
  const addCriteria = () => {
    updateField('criteria', [...data.criteria, { id: Date.now().toString(), name: 'New Criteria', description: '', scale: '1-3', weight: 1 }]);
  };

  const updateCriteria = (id: string, field: keyof Criterion, val: string | number) => {
    updateField('criteria', data.criteria.map(c => c.id === id ? { ...c, [field]: val } : c));
  };
  
  const removeCriteria = (id: string) => {
    updateField('criteria', data.criteria.filter(c => c.id !== id));
  };

  // Category Helpers
  const addSponsorCategory = () => {
    const catName = newSponsorCat.trim();
    if (!catName || data.sponsorCategories.includes(catName) || data.organizerCategories.includes(catName)) return;
    
    onChange({
        ...data,
        sponsorCategories: [...data.sponsorCategories, catName]
    });
    setNewSponsorCat('');
  }

  const removeSponsorCategory = (catName: string) => {
      onChange({
          ...data,
          sponsorCategories: data.sponsorCategories.filter(c => c !== catName)
      });
  }

  const promoteToOrganizer = (catName: string) => {
      // 1. Remove from Sponsor
      const updatedSpon = data.sponsorCategories.filter(c => c !== catName);
      
      // 2. Add to Organizer (avoid duplicates if active)
      let updatedOrg = data.organizerCategories;
      if (!updatedOrg.includes(catName)) {
        updatedOrg = [...updatedOrg, catName];
      }
      
      // 3. Add Criteria (if not already existing by name)
      let updatedCriteria = data.criteria;
      if (!updatedCriteria.some(c => c.name === catName)) {
          const newCriterion: Criterion = {
            id: `gen-${Date.now()}`,
            name: catName,
            description: `Relevance/Quality specifically for the ${catName} track.`,
            scale: '1-3',
            weight: 1
          };
          updatedCriteria = [...updatedCriteria, newCriterion];
      }
      
      onChange({
          ...data,
          sponsorCategories: updatedSpon,
          organizerCategories: updatedOrg,
          criteria: updatedCriteria
      });
  }

  const addOrgCategory = () => {
    const catName = newOrgCat.trim();
    if (!catName || data.organizerCategories.includes(catName)) return;

    // 1. Add to categories list
    const updatedCats = [...data.organizerCategories, catName];
    
    // 2. Automatically generate a criterion for it
    const newCriterion: Criterion = {
        id: `gen-${Date.now()}`,
        name: catName,
        description: `Relevance/Quality specifically for the ${catName} track.`,
        scale: '1-3',
        weight: 1
    };
    const updatedCriteria = [...data.criteria, newCriterion];

    onChange({
        ...data,
        organizerCategories: updatedCats,
        criteria: updatedCriteria
    });
    setNewOrgCat('');
  };

  const removeOrgCategory = (catName: string) => {
    // 1. Remove from categories list
    const updatedCats = data.organizerCategories.filter(c => c !== catName);
    
    // 2. Remove the generated criterion (by name matching)
    const updatedCriteria = data.criteria.filter(c => c.name !== catName);

    onChange({
        ...data,
        organizerCategories: updatedCats,
        criteria: updatedCriteria
    });
  };

  // Map Image Helpers
  const handleMapUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(newImages => {
        onChange({
            ...data,
            tableMapImages: [...(data.tableMapImages || []), ...newImages]
        });
    });
    
    // Reset input
    event.target.value = '';
  };

  const removeMapImage = (index: number) => {
    const newImages = [...(data.tableMapImages || [])];
    newImages.splice(index, 1);
    onChange({ ...data, tableMapImages: newImages });
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* 0. Data Management (Backup/Restore) */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-600 overflow-hidden">
          <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
              <div className="min-w-[200px] flex-1">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     <Save className="text-indigo-600" size={24} /> Data Backup & Restore
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                      Save your complete event configuration or restore from a backup file.
                  </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto shrink-0">
                   <button 
                      type="button"
                      onClick={handleExport}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded font-medium transition-colors shadow-sm whitespace-nowrap"
                   >
                       <Download size={18}/> Export Data
                   </button>
                   
                   <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded font-medium transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                       <Upload size={18}/> 
                       <span>Restore Data</span>
                       <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleImport} 
                          accept=".json" 
                       />
                   </label>
              </div>
          </div>
      </section>

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
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-col space-y-2">
                <label className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <input type="checkbox" className="form-checkbox text-indigo-600" />
                  <span>Did you print [{(Math.ceil((data.estimatedCheckIns || 0)/5) * 1.3).toFixed(0)}] table numbers?</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <input type="checkbox" className="form-checkbox text-indigo-600" />
                  <span>Do you have a labeled map for judges?</span>
                </label>
            </div>

            <div className="border-t pt-4">
                 <label className="block text-sm font-bold text-gray-700 mb-2">
                    Venue Maps / Table Layouts
                    <span className="text-xs font-normal text-gray-500 ml-2">(Displayed in Directory for Hackers)</span>
                 </label>
                 <div className="flex gap-4 items-start flex-col sm:flex-row">
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0">
                        <ImageIcon className="w-8 h-8 text-indigo-400 mb-2" />
                        <span className="text-xs text-indigo-600 font-semibold text-center px-1">Upload Map(s)</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleMapUpload} />
                    </label>

                    {data.tableMapImages && data.tableMapImages.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {data.tableMapImages.map((img, idx) => (
                                <div key={idx} className="relative w-32 h-32 border rounded-lg overflow-hidden group shadow-sm bg-gray-100">
                                    <img src={img} alt="Venue Map" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => removeMapImage(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                        title="Remove Image"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
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
          {editingJudgeId ? (
            <>
              <button onClick={addJudge} className="bg-green-600 text-white p-2 rounded flex items-center justify-center">
                <Save size={20} />
              </button>
              <button onClick={cancelEditJudge} className="bg-gray-400 text-white p-2 rounded flex items-center justify-center">
                <X size={20} />
              </button>
            </>
          ) : (
            <button onClick={addJudge} className="bg-indigo-600 text-white p-2 rounded flex items-center justify-center">
              <Plus size={20} />
            </button>
          )}
        </div>

        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {data.judges.map(judge => (
            <li key={judge.id} className={`flex justify-between items-center bg-gray-50 p-2 rounded text-sm ${editingJudgeId === judge.id ? 'border border-indigo-500 bg-indigo-50' : ''}`}>
              <span>{judge.name} - {judge.phone}</span>
              <div className="flex gap-2">
                <button onClick={() => startEditJudge(judge)} className="text-blue-500 hover:text-blue-700">
                    <Edit2 size={16}/>
                </button>
                <button onClick={() => removeJudge(judge.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16}/>
                </button>
              </div>
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
        
        <div className="space-y-3">
          {data.organizers.map((org, idx) => (
            <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-grow">
                 <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-0.5">Role</label>
                    <select 
                        className="border p-1.5 rounded text-sm bg-gray-50" 
                        value={org.role} 
                        onChange={e => updateOrganizer(idx, 'role', e.target.value)}
                    >
                        {Object.values(OrganizerRoleType).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                 </div>
                 <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-0.5">Name</label>
                    <input 
                        className="border p-1.5 rounded text-sm" 
                        value={org.name} 
                        onChange={e => updateOrganizer(idx, 'name', e.target.value)}
                        placeholder="Organizer Name"
                    />
                 </div>
                 <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-500 mb-0.5">Phone</label>
                    <input 
                        className="border p-1.5 rounded text-sm" 
                        value={org.phone} 
                        onChange={e => updateOrganizer(idx, 'phone', e.target.value)}
                        placeholder="Phone Number"
                    />
                 </div>
              </div>
              <button onClick={() => removeOrganizer(idx)} className="text-gray-400 hover:text-red-500 mt-5">
                  <Trash2 size={18}/>
              </button>
            </div>
          ))}
        </div>
        
        <button onClick={addEmptyOrganizer} className="mt-4 flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800">
            <Plus size={16} /> Add Another Organizer
        </button>
      </section>

      {/* 6. Categories & Criteria */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">6. Categories & Criteria</h2>
        
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-800 mb-1">Sponsor Categories</label>
            <p className="text-xs text-gray-500 mb-2">Prizes or tracks from CSV imports or manual entry. Click the <Gavel size={12} className="inline text-indigo-600" /> icon to promote to an Organizer Category.</p>
            
             <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                className="w-full p-2 border rounded text-sm" 
                placeholder="e.g. Best UI, Financial Hack"
                value={newSponsorCat} 
                onChange={e => setNewSponsorCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSponsorCategory()}
              />
              <button onClick={addSponsorCategory} className="bg-gray-800 text-white p-2 rounded flex items-center">
                <Plus size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.sponsorCategories.map((cat, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm">
                  <Tag size={12} className="text-gray-400 mr-1"/>
                  {cat}
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <button onClick={() => promoteToOrganizer(cat)} className="text-indigo-500 hover:text-indigo-700" title="Promote to Organizer Category (Creates Judging Criteria)">
                    <Gavel size={14} />
                  </button>
                  <button onClick={() => removeSponsorCategory(cat)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {data.sponsorCategories.length === 0 && (
                <span className="text-sm text-gray-400 italic">No sponsor categories added.</span>
              )}
            </div>
        </div>

        <div className="mb-6 bg-indigo-50 p-4 rounded border border-indigo-100">
            <label className="block text-sm font-bold text-indigo-800 mb-1">Organizer Categories</label>
            <p className="text-xs text-indigo-600 mb-2">Adding a category here will automatically generate a judging criterion for it.</p>
            
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                className="w-full p-2 border rounded text-sm" 
                placeholder="e.g. Best Sustainability, Best Beginner"
                value={newOrgCat} 
                onChange={e => setNewOrgCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOrgCategory()}
              />
              <button onClick={addOrgCategory} className="bg-indigo-600 text-white p-2 rounded flex items-center">
                <Plus size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.organizerCategories.map((cat, i) => (
                <span key={i} className="inline-flex items-center bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-sm">
                  {cat}
                  <button onClick={() => removeOrgCategory(cat)} className="ml-2 text-indigo-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))}
              {data.organizerCategories.length === 0 && (
                <span className="text-sm text-gray-400 italic">No specific categories added.</span>
              )}
            </div>
        </div>

        <h3 className="font-semibold text-gray-700 mb-2">Judging Criteria List</h3>
        <p className="text-xs text-gray-500 mb-3">These appear on the scoring sheet. Category-specific criteria will only appear for projects in that category.</p>
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
              <div className="flex items-center text-xs text-gray-500 gap-4">
                <div className="flex items-center">
                    <span>Scale: </span>
                    <input 
                       className="ml-2 bg-transparent border-b w-16"
                       value={crit.scale}
                       onChange={(e) => updateCriteria(crit.id, 'scale', e.target.value)}
                    />
                </div>
                <div className="flex items-center">
                    <span>Weight (x): </span>
                    <input 
                       type="number"
                       min="0.1"
                       step="0.1"
                       className="ml-2 bg-transparent border-b w-12 text-center font-bold text-indigo-600"
                       value={crit.weight || 1}
                       onChange={(e) => updateCriteria(crit.id, 'weight', parseFloat(e.target.value))}
                    />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addCriteria} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
            + Add Custom Criterion
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