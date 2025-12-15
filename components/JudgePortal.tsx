import React, { useState } from 'react';
import { HackathonData, Judge, Project, Score } from '../types';
import { Check, Search, AlertCircle, ChevronRight } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const JudgePortal: React.FC<Props> = ({ data, onChange }) => {
  const [activeJudge, setActiveJudge] = useState<Judge | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to determine if a criterion should be shown for this project
  const getRelevantCriteria = (project: Project) => {
    return data.criteria.filter(c => {
        // If this criterion name matches an organizer category
        if (data.organizerCategories.includes(c.name)) {
            // Only show it if the project has this specific category tag
            return project.categories.includes(c.name);
        }
        // Otherwise, it's a general criterion (like "Originality", "Design"), so show it.
        return true;
    });
  };

  // Reset scores when selecting a new project
  const handleProjectSelect = (p: Project) => {
    setSelectedProject(p);
    const relevant = getRelevantCriteria(p);
    const initialScores: Record<string, number> = {};
    relevant.forEach(c => initialScores[c.id] = 1);
    setScores(initialScores);
    setNote('');
  };

  const submitScore = () => {
    if (!activeJudge || !selectedProject) return;
    
    const newScore: Score = {
      id: Date.now().toString(),
      judgeId: activeJudge.id,
      projectId: selectedProject.id,
      criteria: scores,
      note,
      timestamp: new Date().toISOString()
    };

    onChange({
      ...data,
      scores: [...data.scores, newScore]
    });
    
    setSelectedProject(null); // Return to list
  };

  const handleScoreChange = (criteriaId: string, val: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: val }));
  };

  // Filter projects (search by name or table) and exclude No Shows
  const filteredProjects = data.projects.filter(p => 
    !p.noShow && // Check for No Show
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.table.includes(searchTerm))
  );

  // Filter out projects already judged by this judge
  const availableProjects = filteredProjects.filter(p => 
    !data.scores.some(s => s.judgeId === activeJudge?.id && s.projectId === p.id)
  );

  if (!activeJudge) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-10">
        <h2 className="text-xl font-bold text-center mb-6">Welcome, Judge!</h2>
        <p className="text-gray-600 mb-4 text-center">Please select your name to begin.</p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.judges.length === 0 && <p className="text-center text-red-500">No judges found. Please add judges in Pre-Event Planning.</p>}
          {data.judges.map(j => (
            <button 
              key={j.id}
              onClick={() => setActiveJudge(j)}
              className="w-full p-4 text-left border rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex justify-between items-center"
            >
              <span className="font-medium">{j.name}</span>
              <ChevronRight size={16} className="text-gray-400"/>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (selectedProject) {
    const relevantCriteria = getRelevantCriteria(selectedProject);

    return (
      <div className="bg-white min-h-screen pb-20">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
             <button onClick={() => setSelectedProject(null)} className="text-gray-500 text-sm">Cancel</button>
             <h3 className="font-bold">Scoring Table {selectedProject.table}</h3>
             <div className="w-8"></div>
        </div>
        
        <div className="p-4 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
                <h2 className="text-xl font-bold text-indigo-800">{selectedProject.name}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                    {selectedProject.categories.map((c, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs rounded-full">
                            {c}
                        </span>
                    ))}
                </div>
                {selectedProject.description && <p className="mt-2 text-sm text-gray-700">{selectedProject.description}</p>}
            </div>

            <div className="space-y-6">
                {relevantCriteria.map(c => (
                    <div key={c.id} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-baseline mb-2">
                            <label className="font-bold text-gray-800">{c.name}</label>
                            <span className="text-xs text-gray-500">Scale: {c.scale} {(c.weight || 1) > 1 && <span className="text-indigo-600 font-bold ml-1">(x{c.weight})</span>}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{c.description}</p>
                        
                        {/* Assuming 1-3 scale as per prompt default, but making it flexible */}
                        <div className="flex gap-2">
                            {[1, 2, 3].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleScoreChange(c.id, val)}
                                    className={`flex-1 py-3 rounded font-bold transition-all ${
                                        scores[c.id] === val 
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <label className="font-bold block mb-2">Private Notes (Optional)</label>
                <textarea 
                    className="w-full border p-3 rounded h-24" 
                    placeholder="Feedback for organizers..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                />
            </div>

            <button 
                onClick={submitScore}
                className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded shadow-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
                <Check /> Submit Score
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="bg-indigo-900 text-white p-6 rounded-b-xl shadow-lg mb-6">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-2xl font-bold">Hello, {activeJudge.name}</h1>
                <p className="text-indigo-200 text-sm">Select a project to judge.</p>
             </div>
             <button onClick={() => setActiveJudge(null)} className="text-xs bg-indigo-800 px-2 py-1 rounded">Switch User</button>
         </div>
         <div className="relative">
             <Search className="absolute left-3 top-3 text-gray-400" size={18} />
             <input 
                className="w-full p-2 pl-10 rounded text-gray-800" 
                placeholder="Search by table # or name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="px-4 space-y-3">
        {availableProjects.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No projects found matching your search.</p>
            </div>
        )}
        {availableProjects.map(p => (
            <div 
                key={p.id} 
                onClick={() => handleProjectSelect(p)}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center active:bg-gray-50 cursor-pointer"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded">Table {p.table}</span>
                        <div className="flex gap-1 overflow-hidden">
                           {p.categories.slice(0, 2).map((c, i) => (
                               <span key={i} className="text-gray-500 text-xs bg-gray-100 px-1 rounded truncate max-w-[100px]">{c}</span>
                           ))}
                           {p.categories.length > 2 && <span className="text-gray-400 text-xs">+{p.categories.length - 2}</span>}
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-800">{p.name}</h3>
                </div>
                <ChevronRight className="text-gray-300" />
            </div>
        ))}
      </div>
    </div>
  );
};