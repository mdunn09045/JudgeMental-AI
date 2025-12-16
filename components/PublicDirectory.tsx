import React, { useState, useMemo } from 'react';
import { HackathonData } from '../types';
import { Search, Filter, MapPin, LogOut, Users, Map } from 'lucide-react';

interface Props {
  data: HackathonData;
  onExit?: () => void;
}

export const PublicDirectory: React.FC<Props> = ({ data, onExit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMaps, setShowMaps] = useState(false);

  // Extract all unique categories from projects + organizer/sponsor lists to ensure filter list is complete
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    // Include predefined ones
    data.organizerCategories.forEach(c => cats.add(c));
    data.sponsorCategories.forEach(c => cats.add(c));
    // Include actual used categories from projects
    data.projects.forEach(p => p.categories.forEach(c => cats.add(c)));
    return Array.from(cats).filter(c => c && c.trim().length > 0).sort();
  }, [data]);

  const filteredProjects = data.projects.filter(p => {
    if (p.noShow) return false;
    
    const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
    const matchesCategory = selectedCategory 
        ? p.categories.includes(selectedCategory) 
        : true;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
      // Sort by table number if numeric, else string
      const tableA = parseInt(a.table);
      const tableB = parseInt(b.table);
      if (!isNaN(tableA) && !isNaN(tableB)) return tableA - tableB;
      return a.table.localeCompare(b.table);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-fade-in">
        {/* Header Section */}
        <div className="bg-indigo-700 text-white p-6 shadow-lg rounded-b-xl mb-6">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MapPin size={24} /> Project Directory
                </h1>
                {onExit && (
                    <button 
                        onClick={onExit}
                        className="flex items-center gap-1 text-xs bg-indigo-800 hover:bg-indigo-600 text-indigo-100 px-3 py-1.5 rounded transition-colors border border-indigo-600"
                    >
                        <LogOut size={14} /> Exit
                    </button>
                )}
            </div>
            <p className="text-indigo-200 text-sm mb-4">Find teams, table numbers, and project details.</p>
            
            <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-3 text-indigo-300" size={18} />
                <input 
                    type="text"
                    placeholder="Search by project name, table #, or description..."
                    className="w-full p-3 pl-10 rounded-lg bg-indigo-800 text-white placeholder-indigo-300 border border-indigo-600 focus:outline-none focus:ring-2 focus:ring-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Map Toggle (If Maps Exist) */}
        {data.tableMapImages && data.tableMapImages.length > 0 && (
            <div className="px-4 mb-6 max-w-6xl mx-auto">
                <button 
                    onClick={() => setShowMaps(!showMaps)}
                    className="w-full bg-white border border-indigo-200 text-indigo-700 p-3 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                >
                    <Map size={20} /> 
                    {showMaps ? 'Hide Venue Maps' : 'View Venue Maps & Table Layout'}
                </button>
                
                {showMaps && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        {data.tableMapImages.map((img, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden shadow-sm bg-gray-100">
                                <img src={img} alt={`Venue Map ${idx + 1}`} className="w-full h-auto" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Category Filters */}
        <div className="px-4 mb-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 font-semibold">
                <Filter size={14} /> Filter by Category
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                <button 
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shadow-sm ${
                        selectedCategory === null 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    All Projects
                </button>
                {allCategories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shadow-sm ${
                            selectedCategory === cat
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Results */}
        <div className="px-4 space-y-4 max-w-4xl mx-auto">
            {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No projects found matching your criteria.</p>
                </div>
            )}
            
            {filteredProjects.map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow group">
                    {/* Table Number Badge */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 bg-gray-50 rounded-lg border border-gray-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">Table</span>
                        <span className="text-3xl font-black text-indigo-600">{p.table}</span>
                    </div>

                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{p.name}</h3>
                        
                        {p.teamMembers && p.teamMembers.length > 0 && (
                            <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
                                <Users size={14} className="mt-0.5 text-indigo-400 shrink-0"/>
                                <span className="line-clamp-1">{p.teamMembers.join(', ')}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                            {p.categories.map((c, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
            Showing {filteredProjects.length} projects
        </div>
    </div>
  );
};
