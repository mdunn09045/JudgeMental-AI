import React, { useState, useMemo, useEffect } from 'react';
import { HackathonData, Judge, Project, Score, ReportType, UserRole } from '../types';
import { Check, Search, AlertCircle, ChevronRight, CheckCircle2, Users, Star, ArrowRight, Flag, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
  currentUser?: { name: string; id?: string } | null;
  userRole?: UserRole | null;
}

export const JudgePortal: React.FC<Props> = ({ data, onChange, currentUser, userRole }) => {
  // Determine initial judge based on role
  const getInitialJudge = () => {
      if (userRole === 'JUDGE' && currentUser?.id) {
          return data.judges.find(j => j.id === currentUser.id) || null;
      }
      return null;
  };

  const [activeJudge, setActiveJudge] = useState<Judge | null>(getInitialJudge);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-set judge if role is JUDGE (safeguard against prop updates)
  useEffect(() => {
    if (userRole === 'JUDGE' && currentUser?.id) {
        const j = data.judges.find(j => j.id === currentUser.id);
        setActiveJudge(j || null);
    }
  }, [userRole, currentUser, data.judges]);

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

  // Helper: Get existing score for current judge & project
  const getExistingScore = (projectId: string) => {
      if (!activeJudge) return undefined;
      return data.scores.find(s => s.judgeId === activeJudge.id && s.projectId === projectId);
  };

  // Helper: Get existing report
  const getExistingReport = (projectId: string) => {
      if (!activeJudge) return undefined;
      // Get the latest pending report
      return data.reports.find(r => 
          r.judgeId === activeJudge.id && 
          r.projectId === projectId && 
          r.status === 'pending'
      );
  };

  // Filter projects for the active judge
  const judgeProjects = useMemo(() => {
    if (!activeJudge) return [];
    
    // If assignments exist, filter by assignment
    if (data.assignments && data.assignments.length > 0) {
        const assignedIds = data.assignments
            .filter(a => a.judgeId === activeJudge.id)
            .map(a => a.projectId);
        
        return data.projects.filter(p => assignedIds.includes(p.id) && !p.noShow);
    }
    
    // Fallback if no assignments: Show all non-noShow projects
    return data.projects.filter(p => !p.noShow);
  }, [activeJudge, data.assignments, data.projects]);

  // "Up Next" Feature: Pick a random pending project to suggest
  const nextProject = useMemo(() => {
    if (!activeJudge) return null;
    const pending = judgeProjects.filter(p => !getExistingScore(p.id));
    if (pending.length === 0) return null;
    // Pick random from pending to prevent table 1 bottleneck
    const randomIndex = Math.floor(Math.random() * pending.length);
    return pending[randomIndex];
  }, [judgeProjects, activeJudge, data.scores]);


  // Reset scores or load existing when selecting a project
  const handleProjectSelect = (p: Project) => {
    setSelectedProject(p);
    const existing = getExistingScore(p.id);

    if (existing) {
        setScores(existing.criteria);
        setNote(existing.note);
    } else {
        // Default to blank (empty object) so judges must explicitly select scores
        setScores({});
        setNote('');
    }
  };

  const submitScore = () => {
    if (!activeJudge || !selectedProject) return;
    
    // Validate that all relevant criteria are selected
    const relevant = getRelevantCriteria(selectedProject);
    const missing = relevant.some(c => scores[c.id] === undefined);
    
    if (missing) {
        alert("Please ensure all criteria have a score selected before submitting.");
        return;
    }

    const existing = getExistingScore(selectedProject.id);

    const newScore: Score = {
      id: existing ? existing.id : Date.now().toString(),
      judgeId: activeJudge.id,
      projectId: selectedProject.id,
      criteria: scores,
      note,
      timestamp: new Date().toISOString()
    };

    let updatedScores = [...data.scores];
    if (existing) {
        // Update existing score
        updatedScores = updatedScores.map(s => s.id === existing.id ? newScore : s);
    } else {
        // Add new score
        updatedScores.push(newScore);
    }

    onChange({
      ...data,
      scores: updatedScores
    });
    
    setSelectedProject(null); // Return to list
  };

  const reportIssue = (type: ReportType) => {
      if (!activeJudge || !selectedProject) return;

      // Toggle off if already reported same type
      const existing = getExistingReport(selectedProject.id);
      
      let newReports = [...data.reports];

      if (existing) {
          // If clicking same type, remove it (toggle off)
          // If clicking different type, update it
          if (existing.type === type) {
              newReports = newReports.filter(r => r.id !== existing.id);
          } else {
              newReports = newReports.map(r => r.id === existing.id ? { ...r, type, timestamp: new Date().toISOString() } : r);
          }
      } else {
          newReports.push({
              id: `rep-${Date.now()}`,
              judgeId: activeJudge.id,
              projectId: selectedProject.id,
              type: type,
              status: 'pending',
              timestamp: new Date().toISOString()
          });
      }

      onChange({
          ...data,
          reports: newReports
      });
  };

  const handleScoreChange = (criteriaId: string, val: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: val }));
  };

  // Display List: Sorted by Table Number usually
  const displayList = judgeProjects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.table.includes(searchTerm)
  ).sort((a, b) => {
      // Sort numeric if possible
      const tA = parseInt(a.table);
      const tB = parseInt(b.table);
      if (!isNaN(tA) && !isNaN(tB)) return tA - tB;
      return a.table.localeCompare(b.table);
  });

  if (!activeJudge) {
    if (userRole === 'JUDGE') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-fade-in">
                <AlertCircle className="w-16 h-16 text-red-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Account Error</h2>
                <p className="text-gray-500 max-w-sm mt-2">
                    We could not locate your judge profile in the active event data. Please contact an organizer.
                </p>
                <div className="mt-4 text-xs font-mono bg-gray-100 p-2 rounded">
                    User ID: {currentUser?.id || 'Unknown'}
                </div>
            </div>
        );
    }

    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-10 animate-fade-in">
        <h2 className="text-xl font-bold text-center mb-6">Select Judge Identity</h2>
        <p className="text-gray-600 mb-4 text-center text-sm">You are in Admin mode. Select a judge to view their portal.</p>
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
    const isEditing = !!getExistingScore(selectedProject.id);
    const currentReport = getExistingReport(selectedProject.id);

    return (
      <div className="bg-white min-h-screen pb-20 animate-fade-in">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10 shadow-sm">
             <button onClick={() => setSelectedProject(null)} className="text-gray-500 text-sm font-medium">Cancel</button>
             <h3 className="font-bold text-gray-800">Scoring Table {selectedProject.table}</h3>
             <div className="w-8"></div>
        </div>
        
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h2 className="text-xl font-bold text-indigo-800">{selectedProject.name}</h2>
                {selectedProject.teamMembers && selectedProject.teamMembers.length > 0 && (
                   <div className="flex items-center gap-2 text-sm text-indigo-700 mt-1 mb-2">
                      <Users size={14} />
                      <span>{selectedProject.teamMembers.join(', ')}</span>
                   </div>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                    {selectedProject.categories.map((c, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs rounded-full">
                            {c}
                        </span>
                    ))}
                </div>
                {selectedProject.description && <p className="mt-2 text-sm text-gray-700">{selectedProject.description}</p>}
                
                {/* Reporting Options */}
                <div className="mt-4 pt-3 border-t border-indigo-200 flex gap-2">
                    <button 
                        onClick={() => reportIssue('no-show')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors border ${
                            currentReport?.type === 'no-show' 
                            ? 'bg-gray-100 text-gray-700 border-gray-300' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Flag size={16} /> 
                        {currentReport?.type === 'no-show' ? 'Reported No Show' : 'No Show'}
                    </button>
                    <button 
                        onClick={() => reportIssue('cheating')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors border ${
                            currentReport?.type === 'cheating' 
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                        }`}
                    >
                        <AlertTriangle size={16} /> 
                        {currentReport?.type === 'cheating' ? 'Reported Cheating' : 'Report Cheating'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center italic">
                    Use <span className="font-bold">No Show</span> if team is missing. Use <span className="font-bold text-red-500">Cheating</span> to flag suspicious activity.
                </p>
                {currentReport && (
                    <p className="text-xs text-green-600 mt-2 text-center italic font-bold">
                        Report submitted. Organizers have been notified.
                    </p>
                )}
            </div>

            <div className="space-y-6">
                {relevantCriteria.map(c => (
                    <div key={c.id} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-baseline mb-2">
                            <label className="font-bold text-gray-800">{c.name}</label>
                            <span className="text-xs text-gray-500">Scale: {c.scale} {(c.weight || 1) > 1 && <span className="text-indigo-600 font-bold ml-1">(x{c.weight})</span>}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{c.description}</p>
                        
                        <div className="flex gap-2">
                            {[1, 2, 3].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleScoreChange(c.id, val)}
                                    className={`flex-1 py-3 rounded font-bold transition-all ${
                                        scores[c.id] === val 
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105 ring-2 ring-indigo-300' 
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
                <label className="font-bold block mb-2 text-gray-700">Private Notes (Optional)</label>
                <textarea 
                    className="w-full border p-3 rounded h-24 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="Feedback for organizers..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                />
            </div>

            <button 
                onClick={submitScore}
                className={`w-full py-4 text-white text-lg font-bold rounded shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                <Check /> {isEditing ? 'Update Score' : 'Submit Score'}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 animate-fade-in">
      <div className="bg-indigo-900 text-white p-6 rounded-b-xl shadow-lg mb-6">
         <div className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-2xl font-bold">Hello, {activeJudge.name}</h1>
                <p className="text-indigo-200 text-sm">
                    {data.assignments?.length ? 'You have assigned tables below.' : 'Select a project to judge.'}
                </p>
             </div>
             {userRole !== 'JUDGE' && (
                <button onClick={() => setActiveJudge(null)} className="text-xs bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors border border-indigo-600">Switch User</button>
             )}
         </div>
         <div className="relative max-w-md mx-auto">
             <Search className="absolute left-3 top-3 text-gray-400" size={18} />
             <input 
                className="w-full p-2 pl-10 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" 
                placeholder="Search by table # or name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="px-4 space-y-4 max-w-2xl mx-auto">
        
        {/* Suggested Next Project Card */}
        {!searchTerm && nextProject && (
            <div 
                onClick={() => handleProjectSelect(nextProject)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white shadow-md cursor-pointer hover:scale-[1.02] transition-transform mb-6"
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                        <Star size={12} fill="white" /> Suggested Start
                    </span>
                    <ArrowRight className="opacity-70" size={20} />
                </div>
                <h3 className="text-xl font-bold mb-1">{nextProject.name}</h3>
                <div className="text-indigo-100 font-mono text-lg">Table {nextProject.table}</div>
                <p className="text-xs opacity-80 mt-2">To prevent overcrowding, please head here next!</p>
            </div>
        )}

        {displayList.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No projects found.</p>
            </div>
        )}
        
        {displayList.map(p => {
            const isJudged = !!getExistingScore(p.id);
            return (
                <div 
                    key={p.id} 
                    onClick={() => handleProjectSelect(p)}
                    className={`p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer transition-all ${
                        isJudged 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-white border-gray-100 hover:border-indigo-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isJudged ? 'bg-green-200 text-green-800' : 'bg-gray-800 text-white'}`}>
                                Table {p.table}
                            </span>
                            <div className="flex gap-1 overflow-hidden">
                            {p.categories.slice(0, 2).map((c, i) => (
                                <span key={i} className="text-gray-500 text-xs bg-gray-100 px-1 rounded truncate max-w-[100px] border border-gray-200">{c}</span>
                            ))}
                            </div>
                        </div>
                        <h3 className={`font-bold truncate ${isJudged ? 'text-green-900' : 'text-gray-800'}`}>{p.name}</h3>
                    </div>
                    
                    {isJudged ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-bold bg-white px-2 py-1 rounded border border-green-100 shadow-sm">
                            <CheckCircle2 size={16} />
                            <span className="hidden sm:inline">Done</span>
                        </div>
                    ) : (
                        <ChevronRight className="text-gray-300" />
                    )}
                </div>
            );
        })}
      </div>
      
      {displayList.some(p => !!getExistingScore(p.id)) && (
          <div className="text-center mt-6 text-xs text-gray-400">
              <p>Green shaded projects have been scored. Click to edit.</p>
          </div>
      )}
    </div>
  );
};
