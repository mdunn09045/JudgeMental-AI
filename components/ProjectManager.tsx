import React, { useState, useRef, useMemo } from 'react';
import { HackathonData, Project, Assignment } from '../types';
import { Plus, Trash2, FileText, Upload, FileSpreadsheet, Info, X, Mail, Shuffle, Zap, AlertTriangle } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const ProjectManager: React.FC<Props> = ({ data, onChange }) => {
  const [newProject, setNewProject] = useState<{name: string, table: string, categoriesStr: string, teamMembersStr: string, submitterEmail: string, description: string}>({ 
    name: '', table: '', categoriesStr: 'General', teamMembersStr: '', submitterEmail: '', description: '' 
  });
  
  // Assignment State
  const [assignRounds, setAssignRounds] = useState<number>(3);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute all unique categories available in the system
  const allKnownCategories = useMemo(() => {
    const cats = new Set<string>();
    data.organizerCategories.forEach(c => cats.add(c));
    data.sponsorCategories.forEach(c => cats.add(c));
    data.projects.forEach(p => p.categories.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [data]);

  // --- CRUD Operations ---
  const addProject = () => {
    if (newProject.name && newProject.table) {
      const categories = newProject.categoriesStr.split(',').map(c => c.trim()).filter(c => c.length > 0);
      const teamMembers = newProject.teamMembersStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      const p: Project = {
        id: Date.now().toString(),
        name: newProject.name,
        table: newProject.table,
        categories: categories.length > 0 ? categories : ['General'],
        teamMembers: teamMembers,
        submitterEmail: newProject.submitterEmail,
        description: newProject.description,
        noShow: false
      };
      onChange({ ...data, projects: [...data.projects, p] });
      setNewProject({ name: '', table: '', categoriesStr: 'General', teamMembersStr: '', submitterEmail: '', description: '' });
    }
  };

  const removeProject = (id: string) => {
    onChange({ ...data, projects: data.projects.filter(p => p.id !== id) });
  };

  const updateProjectField = (id: string, field: keyof Project, value: any) => {
    onChange({
      ...data,
      projects: data.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const confirmClearAll = () => {
    onChange({
        ...data,
        projects: [],
        assignments: [],
        scores: [],
        reports: []
    });
    setShowClearConfirm(false);
  };

  // --- Assignment Logic ---

  const generateAssignments = () => {
    if (data.judges.length === 0) {
      alert("No judges available. Please add judges in the Planning tab.");
      return;
    }
    if (data.projects.filter(p => !p.noShow).length === 0) {
      alert("No active projects to assign.");
      return;
    }

    const assignments: Assignment[] = [];
    const activeProjects = data.projects.filter(p => !p.noShow).sort((a, b) => {
        // Sort numeric if possible for logic, falling back to string
        const tA = parseInt(a.table);
        const tB = parseInt(b.table);
        if (!isNaN(tA) && !isNaN(tB)) return tA - tB;
        return a.table.localeCompare(b.table);
    });

    // Tracking judge load
    const judgeLoad: Record<string, number> = {};
    const judgeLastTable: Record<string, number> = {}; // Track the numeric table of the last assigned project
    data.judges.forEach(j => {
        judgeLoad[j.id] = 0;
        judgeLastTable[j.id] = -999; // Initialize far away
    });

    // Algorithm: Greedy allocation with Proximity Constraint
    
    activeProjects.forEach(project => {
        const tableNum = parseInt(project.table) || 0;
        
        // We need to find 'assignRounds' judges for this project
        for (let r = 0; r < assignRounds; r++) {
            
            // Filter judges who haven't been assigned this project yet
            let candidates = data.judges.filter(j => 
                !assignments.some(a => a.judgeId === j.id && a.projectId === project.id)
            );

            // Scoring function for candidates
            // Higher score = Better candidate
            const scoredCandidates = candidates.map(judge => {
                let score = 0;
                
                // 1. Load Balancing (Heavy weight)
                score -= (judgeLoad[judge.id] * 50);

                // 2. Proximity Constraint (The "10 table gap" rule)
                const lastTable = judgeLastTable[judge.id];
                const dist = Math.abs(tableNum - lastTable);

                if (dist <= 10) {
                    // Reward keeping them in flow
                    score += 100;
                } else if (judgeLoad[judge.id] === 0) {
                    // Reward starting a fresh judge on a new cluster
                    score += 50;
                } else {
                    // Penalize large jumps, but don't forbid (fallback)
                    score -= dist;
                }

                // 3. Randomness
                score += Math.random() * 20;

                return { judge, score };
            });

            // Sort by score descending
            scoredCandidates.sort((a, b) => b.score - a.score);

            if (scoredCandidates.length > 0) {
                const best = scoredCandidates[0].judge;
                
                assignments.push({
                    id: `assign-${Date.now()}-${assignments.length}`,
                    judgeId: best.id,
                    projectId: project.id,
                    status: 'pending'
                });
                
                judgeLoad[best.id]++;
                judgeLastTable[best.id] = tableNum;
            }
        }
    });

    // Update state
    onChange({ ...data, assignments });
    alert(`Generated ${assignments.length} assignments. Each project assigned approx ${assignRounds} times.`);
  };

  const clearAssignments = () => {
      if(confirm("Are you sure? This will remove all judge assignments. Scores will remain.")) {
          onChange({ ...data, assignments: [] });
      }
  };


  // --- CSV Import ---
  const parseCSV = (text: string): string[][] => {
    const arr: string[][] = [];
    let quote = false;
    let row: string[] = [];
    let col = '';
    let c = 0;
    for (; c < text.length; c++) {
        const cc = text[c];
        const nc = text[c+1];
        
        if (cc === '"') {
            if (quote && nc === '"') { 
                col += '"'; 
                c++; 
            } else { 
                quote = !quote; 
            }
        } else if (cc === ',' && !quote) { 
            row.push(col);
            col = '';
        } else if ((cc === '\r' || cc === '\n') && !quote) {
            if (cc === '\r' && nc === '\n') c++;
            row.push(col);
            arr.push(row);
            row = [];
            col = '';
        } else {
            col += cc;
        }
    }
    if (row.length > 0 || col.length > 0) {
        row.push(col);
        arr.push(row);
    }
    return arr;
  };

  const getMaxTableNumber = (projects: Project[]) => {
    let max = 0;
    projects.forEach(p => {
        const n = parseInt(p.table);
        if (!isNaN(n) && n > max) max = n;
    });
    return max;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const rows = parseCSV(text);
        if (rows.length < 2) {
            alert("CSV appears to be empty or missing data rows.");
            return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        const nameIdx = headers.findIndex(h => h === 'project title' || h === 'name' || h === 'project name');
        const tableIdx = headers.findIndex(h => h.includes('table') && !h.includes('assignment'));
        const catIdx = headers.findIndex(h => h === 'opt-in prizes' || h === 'category' || h === 'track');
        const descIdx = headers.findIndex(h => h === 'about the project' || h === 'description');
        const emailIdx = headers.findIndex(h => h === 'submitter email' || h === 'email');

        const subFirstIdx = headers.findIndex(h => h === 'submitter first name');
        const subLastIdx = headers.findIndex(h => h === 'submitter last name');
        const genericTeamIdx = headers.findIndex(h => h === 'team members' || h === 'team');

        if (nameIdx === -1) {
            alert("Could not detect 'Project Title' or 'Name' column in the CSV.");
            return;
        }

        const newProjects: Project[] = [];
        let nextTableNum = getMaxTableNumber(data.projects) + 1;
        const projectTableMap = new Map<string, string>(); 

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;
            if (row.length <= nameIdx) continue;
            const name = row[nameIdx];
            if (!name) continue;

            const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
            const uniqueKey = `${name.toLowerCase().trim()}|${email.toLowerCase().trim()}`;

            let table = '';
            if (tableIdx !== -1 && row[tableIdx]) {
                table = row[tableIdx];
            } else {
                if (projectTableMap.has(uniqueKey)) {
                    table = projectTableMap.get(uniqueKey)!;
                } else {
                    table = nextTableNum.toString();
                    projectTableMap.set(uniqueKey, table);
                    nextTableNum++;
                }
            }

            const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : '';
            let categories: string[] = ['General'];
            if (catIdx !== -1 && row[catIdx]) {
                const catRaw = row[catIdx];
                const split = catRaw.split(',').map(s => s.trim()).filter(s => s);
                if (split.length > 0) {
                    categories = split;
                }
            }

            const teamMembers: string[] = [];
            if (genericTeamIdx !== -1 && row[genericTeamIdx]) {
                teamMembers.push(...row[genericTeamIdx].split(',').map(s => s.trim()));
            } else {
                if (subFirstIdx !== -1) {
                    const first = row[subFirstIdx] || '';
                    const last = (subLastIdx !== -1 ? row[subLastIdx] : '') || '';
                    if (first || last) teamMembers.push(`${first} ${last}`.trim());
                }
                for (let j = 1; j <= 4; j++) {
                    const fIdx = headers.findIndex(h => h === `team member ${j} first name`);
                    const lIdx = headers.findIndex(h => h === `team member ${j} last name`);
                    if (fIdx !== -1) {
                        const first = row[fIdx] || '';
                        const last = (lIdx !== -1 ? row[lIdx] : '') || '';
                        if (first || last) teamMembers.push(`${first} ${last}`.trim());
                    }
                }
            }

            if (newProjects.some(p => `${p.name.toLowerCase().trim()}|${(p.submitterEmail || '').toLowerCase().trim()}` === uniqueKey)) {
                continue;
            }

            newProjects.push({
                id: `import-${Date.now()}-${i}`,
                name: name,
                table: table,
                categories: categories,
                teamMembers: teamMembers,
                submitterEmail: email,
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                noShow: false
            });
        }

        if (newProjects.length > 0) {
            const existingOrg = new Set(data.organizerCategories);
            const existingSpon = new Set(data.sponsorCategories);
            const catsToAdd = new Set<string>();

            newProjects.forEach(p => {
                p.categories.forEach(c => {
                    if (!existingOrg.has(c) && !existingSpon.has(c) && c !== 'General') {
                        catsToAdd.add(c);
                    }
                });
            });

            const updatedSponCats = [...data.sponsorCategories, ...Array.from(catsToAdd)];

            onChange({ 
                ...data, 
                projects: [...data.projects, ...newProjects],
                sponsorCategories: updatedSponCats
            });
            alert(`Successfully imported ${newProjects.length} projects.${catsToAdd.size > 0 ? ` Automatically added ${catsToAdd.size} new categories.` : ''}`);
        } else {
            alert("No valid projects found in CSV.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse CSV. Please check the console for details.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const generateDemoProjects = () => {
    const categoriesList = ['FinTech', 'Health', 'Sustainability', 'Education', 'Gaming', 'Mobile', 'Web3'];
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Quinn'];
    const lastNames = ['Smith', 'Chen', 'Kim', 'Patel', 'Garcia', 'Johnson', 'Lee'];

    const getRandName = () => `${firstNames[Math.floor(Math.random()*firstNames.length)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`;

    const demoProjects: Project[] = Array.from({ length: 15 }).map((_, i) => {
        const numCats = Math.floor(Math.random() * 3) + 1; 
        const cats = [];
        for(let j=0; j<numCats; j++) {
            cats.push(categoriesList[(i + j) % categoriesList.length]);
        }
        
        const numMembers = Math.floor(Math.random() * 3) + 1;
        const members = Array.from({ length: numMembers }).map(() => getRandName());

        return {
            id: `demo-${i}`,
            name: `Project ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i%5]} ${i+1}`,
            table: `${i + 1}`,
            categories: cats,
            teamMembers: members,
            submitterEmail: `hacker${i}@university.edu`,
            description: 'A revolutionary app that solves big problems.',
            noShow: false
        };
    });
    
    // Auto-harvest for demo as well
    const existingOrg = new Set(data.organizerCategories);
    const existingSpon = new Set(data.sponsorCategories);
    const catsToAdd = new Set<string>();
    demoProjects.forEach(p => p.categories.forEach(c => {
         if (!existingOrg.has(c) && !existingSpon.has(c) && c !== 'General') {
             catsToAdd.add(c);
         }
    }));

    onChange({ 
        ...data, 
        projects: [...data.projects, ...demoProjects],
        sponsorCategories: [...data.sponsorCategories, ...Array.from(catsToAdd)]
    });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
        {/* Custom Confirmation Modal */}
        {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border-t-4 border-red-500">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="bg-red-100 p-3 rounded-full shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Delete All Projects?</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                This action is <strong>irreversible</strong>. It will delete:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                                <li>All {data.projects.length} Projects</li>
                                <li>All Judge Assignments</li>
                                <li>All Submitted Scores</li>
                                <li>All Reports</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowClearConfirm(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={confirmClearAll}
                            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-bold shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Yes, Delete All
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Assignment Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                  <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                      <Zap size={20}/> Auto-Assign Judges
                  </h2>
                  <p className="text-sm text-gray-500">
                      Distribute projects to judges.
                  </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded border border-gray-100">
                  <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-gray-700">Rounds per Project:</label>
                      <input 
                          type="number" 
                          min="1" 
                          max="10" 
                          className="w-16 border p-1 rounded text-center"
                          value={assignRounds}
                          onChange={(e) => setAssignRounds(parseInt(e.target.value) || 1)}
                      />
                  </div>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <button 
                    type="button"
                    onClick={generateAssignments}
                    className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold shadow hover:bg-indigo-700 flex items-center gap-2"
                  >
                      <Shuffle size={16} /> Generate
                  </button>
                  {data.assignments && data.assignments.length > 0 && (
                      <button 
                        type="button"
                        onClick={clearAssignments}
                        className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                          Clear
                      </button>
                  )}
              </div>
          </div>
          
          {data.assignments && data.assignments.length > 0 && (
              <div className="bg-green-50 text-green-800 p-3 rounded text-sm border border-green-200 flex items-center gap-2">
                  <Info size={16}/>
                  <span>
                      <strong>Assignments Active:</strong> {data.assignments.length} total assignments generated. 
                      Go to the <strong>Judge Portal</strong> to see them in action.
                  </span>
              </div>
          )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-indigo-700">Project Management</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload via CSV (Devpost export supported) or manually enter projects.
              </p>
            </div>
            <div className="flex gap-2">
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                />
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded flex items-center gap-2 font-medium transition-colors"
                >
                    <FileSpreadsheet size={16}/> Upload CSV
                </button>
                <button 
                    type="button"
                    onClick={generateDemoProjects}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-3 py-2 rounded flex items-center gap-2 transition-colors"
                >
                    <Upload size={16}/> Load Demo Data
                </button>
                {data.projects.length > 0 && (
                    <button 
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        className="text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded flex items-center gap-2 font-medium transition-colors"
                        title="Delete All Projects"
                    >
                        <Trash2 size={16}/> Clear All
                    </button>
                )}
            </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex gap-3 text-sm text-blue-800 mb-6">
            <Info className="shrink-0 w-5 h-5 mt-0.5 text-blue-600" />
            <div>
                <p className="font-semibold mb-1">CSV Import Guide:</p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-xs sm:text-sm">
                    <li><strong>Devpost Export:</strong> Supports "Project Title", "Opt-In Prizes", "Submitter Email", "Team Members".</li>
                    <li><strong>Duplicate Names:</strong> Projects are distinguished by combining "Project Name" and "Submitter Email".</li>
                    <li><strong>Categories:</strong> New categories found in "Opt-In Prizes" or "Track" columns will be automatically added to Sponsor Categories.</li>
                </ul>
            </div>
        </div>

        <div className="grid gap-2 mb-6 p-4 bg-gray-50 rounded border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Add Single Project</h3>
          <div className="flex gap-2 flex-col md:flex-row">
            <div className="flex-grow flex gap-2">
                <input 
                  placeholder="Project Name" 
                  className="border p-2 rounded w-full"
                  value={newProject.name || ''}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                />
                <input 
                  placeholder="Email (ID)" 
                  className="border p-2 rounded w-48"
                  value={newProject.submitterEmail || ''}
                  onChange={e => setNewProject({...newProject, submitterEmail: e.target.value})}
                />
            </div>
            <input 
              placeholder="Table #" 
              className="border p-2 rounded w-full md:w-20"
              value={newProject.table || ''}
              onChange={e => setNewProject({...newProject, table: e.target.value})}
            />
             <input 
              placeholder="Categories (comma separated)" 
              className="border p-2 rounded w-full md:w-32"
              value={newProject.categoriesStr || ''}
              onChange={e => setNewProject({...newProject, categoriesStr: e.target.value})}
            />
             <input 
              placeholder="Team Members (comma separated)" 
              className="border p-2 rounded w-full md:w-32"
              value={newProject.teamMembersStr || ''}
              onChange={e => setNewProject({...newProject, teamMembersStr: e.target.value})}
            />
            <button type="button" onClick={addProject} className="bg-indigo-600 text-white p-2 rounded flex items-center justify-center min-w-[3rem]">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">No Show</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Project Name / Email</th>
                <th className="px-4 py-3">Team Members</th>
                <th className="px-4 py-3 min-w-[200px]">Categories</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.length === 0 ? (
                <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 italic">No projects added yet.</td>
                </tr>
              ) : (
                  data.projects.map(p => (
                    <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.noShow ? 'bg-gray-100 text-gray-400' : ''}`}>
                      <td className="px-4 py-3">
                        <input 
                            type="checkbox" 
                            checked={!!p.noShow} 
                            onChange={(e) => updateProjectField(p.id, 'noShow', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                        />
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold ${p.noShow ? 'text-gray-400' : 'text-indigo-600'}`}>{p.table}</td>
                      <td className="px-4 py-3">
                          <div className={`font-medium ${p.noShow ? 'line-through' : ''}`}>{p.name}</div>
                          {p.submitterEmail && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <Mail size={10} />
                                  {p.submitterEmail}
                              </div>
                          )}
                      </td>
                      <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={p.teamMembers?.join(', ') || ''}
                            onChange={(e) => {
                                const members = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                updateProjectField(p.id, 'teamMembers', members);
                            }}
                            placeholder="Add members..."
                            className={`border-b bg-transparent focus:border-indigo-500 outline-none w-full text-xs ${p.noShow ? 'text-gray-400' : 'text-gray-600'}`}
                         />
                      </td>
                      <td className="px-4 py-3">
                         {/* Edit via text */}
                         <input 
                            type="text" 
                            value={p.categories.join(', ')}
                            onChange={(e) => {
                                const cats = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                updateProjectField(p.id, 'categories', cats);
                            }}
                            placeholder="Type to add tags..."
                            className={`border-b bg-transparent focus:border-indigo-500 outline-none w-full text-xs mb-2 ${p.noShow ? 'text-gray-400' : 'text-gray-700'}`}
                         />
                         
                         {/* Badges with Delete */}
                         <div className="flex flex-wrap gap-1 mb-2">
                             {p.categories.map((c, i) => (
                                 <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs rounded-full group">
                                     {c}
                                     <button
                                        type="button"
                                        onClick={() => {
                                            const newCats = p.categories.filter((_, idx) => idx !== i);
                                            updateProjectField(p.id, 'categories', newCats);
                                        }}
                                        className="text-indigo-400 hover:text-red-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove"
                                     >
                                         <X size={10} />
                                     </button>
                                 </span>
                             ))}
                         </div>

                         {/* Quick Add Dropdown */}
                         <select
                            className="w-full text-xs border border-gray-200 rounded p-1.5 bg-gray-50 text-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-white"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && !p.categories.includes(val)) {
                                    updateProjectField(p.id, 'categories', [...p.categories, val]);
                                }
                                e.target.value = '';
                            }}
                            defaultValue=""
                            disabled={p.noShow}
                         >
                            <option value="" disabled>+ Add category...</option>
                             {allKnownCategories.filter(c => !p.categories.includes(c)).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                         </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeProject(p.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};