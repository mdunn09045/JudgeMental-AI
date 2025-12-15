import React, { useState, useRef } from 'react';
import { HackathonData, Project } from '../types';
import { Plus, Trash2, FileText, Upload, FileSpreadsheet, Info } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange: (data: HackathonData) => void;
}

export const ProjectManager: React.FC<Props> = ({ data, onChange }) => {
  // We use a temporary string for category input in manual entry
  const [newProject, setNewProject] = useState<{name: string, table: string, categoriesStr: string, description: string}>({ 
    name: '', table: '', categoriesStr: 'General', description: '' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addProject = () => {
    if (newProject.name && newProject.table) {
      const categories = newProject.categoriesStr.split(',').map(c => c.trim()).filter(c => c.length > 0);
      const p: Project = {
        id: Date.now().toString(),
        name: newProject.name,
        table: newProject.table,
        categories: categories.length > 0 ? categories : ['General'],
        description: newProject.description,
        noShow: false
      };
      onChange({ ...data, projects: [...data.projects, p] });
      setNewProject({ name: '', table: '', categoriesStr: 'General', description: '' });
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
        // Devpost uses "Project Title", "Opt-In Prizes", "Submission Url"
        // Simple CSV uses "Name", "Table", "Category"
        const nameIdx = headers.findIndex(h => h === 'project title' || h === 'name' || h === 'project name');
        const tableIdx = headers.findIndex(h => h.includes('table'));
        const catIdx = headers.findIndex(h => h === 'opt-in prizes' || h === 'category' || h === 'track');
        const descIdx = headers.findIndex(h => h === 'about the project' || h === 'description' || h === 'submission url');

        if (nameIdx === -1) {
            alert("Could not detect 'Project Title' or 'Name' column in the CSV.");
            return;
        }

        const newProjects: Project[] = [];
        
        // Auto-assign tables logic
        let nextTableNum = getMaxTableNumber(data.projects) + 1;
        const projectTableMap = new Map<string, string>(); // Keep same table for same project name

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;
            
            // Safety check for row length against name index
            if (row.length <= nameIdx) continue;

            const name = row[nameIdx];
            if (!name) continue;

            // Determine Table Number
            let table = '';
            if (tableIdx !== -1 && row[tableIdx]) {
                table = row[tableIdx];
            } else {
                // Auto-assign table if missing
                if (projectTableMap.has(name)) {
                    table = projectTableMap.get(name)!;
                } else {
                    table = nextTableNum.toString();
                    projectTableMap.set(name, table);
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

            newProjects.push({
                id: `import-${Date.now()}-${i}`,
                name: name,
                table: table,
                categories: categories,
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
    const demoProjects: Project[] = Array.from({ length: 15 }).map((_, i) => {
        // Assign random categories
        const numCats = Math.floor(Math.random() * 3) + 1; // 1 to 3 categories
        const cats = [];
        for(let j=0; j<numCats; j++) {
            cats.push(categoriesList[(i + j) % categoriesList.length]);
        }
        
        return {
            id: `demo-${i}`,
            name: `Project ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i%5]} ${i+1}`,
            table: `${i + 1}`,
            categories: cats,
            description: 'A revolutionary app that solves big problems.',
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
                    <li><strong>Devpost Export:</strong> Supports "Project Title" and "Opt-In Prizes" (imported as tags). Auto-assigns tables if missing.</li>
                    <li><strong>Custom CSV:</strong> Required header "Name". Optional: "Table", "Category" (comma separated), "Description".</li>
                </ul>
            </div>
        </div>

        <div className="grid gap-2 mb-6 p-4 bg-gray-50 rounded border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Add Single Project</h3>
          <div className="flex gap-2 flex-col md:flex-row">
            <input 
              placeholder="Project Name" 
              className="border p-2 rounded flex-grow"
              value={newProject.name || ''}
              onChange={e => setNewProject({...newProject, name: e.target.value})}
            />
            <input 
              placeholder="Table #" 
              className="border p-2 rounded w-full md:w-24"
              value={newProject.table || ''}
              onChange={e => setNewProject({...newProject, table: e.target.value})}
            />
             <input 
              placeholder="Categories (comma separated)" 
              className="border p-2 rounded w-full md:w-64"
              value={newProject.categoriesStr || ''}
              onChange={e => setNewProject({...newProject, categoriesStr: e.target.value})}
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
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">Categories (Comma Sep)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 italic">No projects added yet.</td>
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
                      <td className={`px-4 py-3 font-medium ${p.noShow ? 'line-through' : ''}`}>{p.name}</td>
                      <td className="px-4 py-3">
                         <input 
                            type="text" 
                            value={p.categories.join(', ')}
                            onChange={(e) => {
                                const cats = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                updateProjectField(p.id, 'categories', cats);
                            }}
                            className={`border-b bg-transparent focus:border-indigo-500 outline-none w-full ${p.noShow ? 'text-gray-400' : 'text-gray-700'}`}
                         />
                         <div className="flex flex-wrap gap-1 mt-1">
                             {p.categories.map((c, i) => (
                                 <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                     {c}
                                 </span>
                             ))}
                         </div>
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