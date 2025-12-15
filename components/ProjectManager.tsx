import React, { useState, useRef, useMemo } from 'react';
import { HackathonData, Project } from '../types';
import { Plus, Trash2, FileText, Upload, FileSpreadsheet, Info, X, Mail } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const ProjectManager: React.FC<Props> = ({ data, onChange }) => {
  // We use a temporary string for category input in manual entry
  const [newProject, setNewProject] = useState<{name: string, table: string, categoriesStr: string, teamMembersStr: string, submitterEmail: string, description: string}>({ 
    name: '', table: '', categoriesStr: 'General', teamMembersStr: '', submitterEmail: '', description: '' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute all unique categories available in the system
  const allKnownCategories = useMemo(() => {
    const cats = new Set<string>();
    data.organizerCategories.forEach(c => cats.add(c));
    data.sponsorCategories.forEach(c => cats.add(c));
    data.projects.forEach(p => p.categories.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [data]);

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

  // Robust CSV Parser handling quotes and newlines
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

        // Headers (lower case for case insensitive matching)
        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        // Detect Columns
        const nameIdx = headers.findIndex(h => h === 'project title' || h === 'name' || h === 'project name');
        const tableIdx = headers.findIndex(h => h.includes('table') && !h.includes('assignment'));
        const catIdx = headers.findIndex(h => h === 'opt-in prizes' || h === 'category' || h === 'track');
        const descIdx = headers.findIndex(h => h === 'about the project' || h === 'description');
        const emailIdx = headers.findIndex(h => h === 'submitter email' || h === 'email');

        // Devpost Team Members logic
        const subFirstIdx = headers.findIndex(h => h === 'submitter first name');
        const subLastIdx = headers.findIndex(h => h === 'submitter last name');
        const genericTeamIdx = headers.findIndex(h => h === 'team members' || h === 'team');

        if (nameIdx === -1) {
            alert("Could not detect 'Project Title' or 'Name' column in the CSV.");
            return;
        }

        const newProjects: Project[] = [];
        
        // Auto-assign tables logic
        let nextTableNum = getMaxTableNumber(data.projects) + 1;
        
        // Map to prevent duplicates if same file uploaded, 
        // AND to group by email if table missing
        const projectTableMap = new Map<string, string>(); 

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;
            
            // Safety check for row length against name index
            if (row.length <= nameIdx) continue;

            const name = row[nameIdx];
            if (!name) continue;

            // Identifier for table assignment: Email > Name
            const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
            const uniqueKey = email || name;

            // Determine Table Number
            let table = '';
            if (tableIdx !== -1 && row[tableIdx]) {
                table = row[tableIdx];
            } else {
                // Auto-assign table if missing
                if (projectTableMap.has(uniqueKey)) {
                    table = projectTableMap.get(uniqueKey)!;
                } else {
                    table = nextTableNum.toString();
                    projectTableMap.set(uniqueKey, table);
                    nextTableNum++;
                }
            }

            const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : '';
            
            // Handle Categories / Opt-In Prizes as Tags
            let categories: string[] = ['General'];
            if (catIdx !== -1 && row[catIdx]) {
                const catRaw = row[catIdx];
                // Split by comma. Devpost uses comma separated list for prizes.
                const split = catRaw.split(',').map(s => s.trim()).filter(s => s);
                if (split.length > 0) {
                    categories = split;
                }
            }

            // Handle Team Members
            const teamMembers: string[] = [];

            // 1. Try generic column
            if (genericTeamIdx !== -1 && row[genericTeamIdx]) {
                teamMembers.push(...row[genericTeamIdx].split(',').map(s => s.trim()));
            } else {
                // 2. Try Devpost columns (Submitter + Team Member 1-4)
                if (subFirstIdx !== -1) {
                    const first = row[subFirstIdx] || '';
                    const last = (subLastIdx !== -1 ? row[subLastIdx] : '') || '';
                    if (first || last) teamMembers.push(`${first} ${last}`.trim());
                }

                // Check for "Team Member N First Name"
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

            newProjects.push({
                id: `import-${Date.now()}-${i}`,
                name: name,
                table: table,
                categories: categories,
                teamMembers: teamMembers,
                submitterEmail: email,
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''), // Truncate description for UI perf
                noShow: false
            });
        }

        if (newProjects.length > 0) {
            onChange({ ...data, projects: [...data.projects, ...newProjects] });
            alert(`Successfully imported ${newProjects.length} projects.`);
        } else {
            alert("No valid projects found in CSV.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse CSV. Please check the console for details.");
      }
      
      // Reset input
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
        // Assign random categories
        const numCats = Math.floor(Math.random() * 3) + 1; // 1 to 3 categories
        const cats = [];
        for(let j=0; j<numCats; j++) {
            cats.push(categoriesList[(i + j) % categoriesList.length]);
        }
        
        // Random Team
        const numMembers = Math.floor(Math.random() * 3) + 1;
        const members = Array.from({ length: numMembers }).map(() => getRandName());

        return {
            id: `demo-${i}`,
            name: `Project ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i%5]} ${i+1}`,
            table: `${i + 1}`,
            categories: cats,
            teamMembers: members,
            submitterEmail: `hacker${i}@university.edu`,
            description: 'A revolutionary app that solves big problems using AI and blockchain technology to disrupt the market.',
            noShow: false
        };
    });
    onChange({ ...data, projects: [...data.projects, ...demoProjects] });
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
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
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded flex items-center gap-2 font-medium transition-colors"
                >
                    <FileSpreadsheet size={16}/> Upload CSV
                </button>
                <button 
                    onClick={generateDemoProjects}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-3 py-2 rounded flex items-center gap-2 transition-colors"
                >
                    <Upload size={16}/> Load Demo Data
                </button>
            </div>
        </div>

        {/* CSV Format Info */}
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex gap-3 text-sm text-blue-800 mb-6">
            <Info className="shrink-0 w-5 h-5 mt-0.5 text-blue-600" />
            <div>
                <p className="font-semibold mb-1">CSV Import Guide:</p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-xs sm:text-sm">
                    <li><strong>Devpost Export:</strong> Supports "Project Title", "Opt-In Prizes", "Submitter Email", "Team Members".</li>
                    <li><strong>Duplicate Names:</strong> Projects with the same name are distinguished by "Submitter Email" during import.</li>
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
            <button onClick={addProject} className="bg-indigo-600 text-white p-2 rounded flex items-center justify-center min-w-[3rem]">
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
                        <button onClick={() => removeProject(p.id)} className="text-red-500 hover:text-red-700">
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