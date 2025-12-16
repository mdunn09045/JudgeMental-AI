import React, { useState } from 'react';
import { HackathonData, JudgeReport } from '../types';
import { getProjectStatus, calculateLeaderboard, ProjectStatus } from '../utils';
import { BarChart2, Download, RefreshCw, Filter, Grid, Inbox, Check, X, AlertTriangle, LayoutGrid, Table } from 'lucide-react';

interface Props {
  data: HackathonData;
  onChange?: (data: HackathonData) => void;
}

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  const colors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500'
  };
  return <div className={`w-3 h-3 rounded-full ${colors[status]} shadow-sm`} />;
};

export const LiveDashboard: React.FC<Props> = ({ data, onChange }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<'simple' | 'matrix'>('simple');

  // 1. Calculate Leaderboard based on active view
  const leaderboard = calculateLeaderboard(
    data.projects, 
    data.scores, 
    data.criteria, 
    data.organizerCategories, 
    activeCategory
  );
  
  // 2. Determine which projects to show in stats/grid
  const displayProjects = activeCategory 
    ? data.projects.filter(p => p.categories.includes(activeCategory))
    : data.projects;

  const totalJudged = data.scores.filter(s => 
    displayProjects.some(p => p.id === s.projectId)
  ).length;
  
  // Calculate progress stats
  const statusCounts = { red: 0, yellow: 0, green: 0, purple: 0 };
  displayProjects.forEach(p => {
    const status = getProjectStatus(p, data.scores, data.judgesPerProject);
    statusCounts[status]++;
  });

  // Pending Reports for Verification
  const pendingReports = data.reports.filter(r => r.status === 'pending');

  const confirmNoShow = (report: JudgeReport) => {
      if (!onChange) return;
      
      const newProjects = data.projects.map(p => 
          p.id === report.projectId ? { ...p, noShow: true } : p
      );
      
      const newReports = data.reports.map(r => 
          r.projectId === report.projectId && r.status === 'pending'
          ? { ...r, status: 'verified' as const } 
          : r
      );

      onChange({
          ...data,
          projects: newProjects,
          reports: newReports
      });
  };

  const confirmCheating = (report: JudgeReport) => {
      if (!onChange) return;
      
      // Mark project as cheating
      const newProjects = data.projects.map(p => 
          p.id === report.projectId ? { ...p, cheating: true } : p
      );
      
      // Mark report as verified
      const newReports = data.reports.map(r => 
          r.projectId === report.projectId && r.status === 'pending'
          ? { ...r, status: 'verified' as const } 
          : r
      );

      onChange({
          ...data,
          projects: newProjects,
          reports: newReports
      });
  };

  const dismissReport = (report: JudgeReport) => {
      if (!onChange) return;
      const newReports = data.reports.map(r => 
          r.id === report.id ? { ...r, status: 'dismissed' as const } : r
      );
      onChange({ ...data, reports: newReports });
  };

  const downloadCSV = () => {
    // Simple CSV export of leaderboard
    const headers = ['Rank', 'Table', 'Project Name', 'Times Judged', 'Rank Points', 'Raw Avg'];
    const rows = leaderboard.map((p, i) => [
        i + 1,
        p.table,
        p.projectName,
        p.timesJudged,
        p.rankPoints,
        p.rawAvg.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `judging_results_${activeCategory || 'OVERALL'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      
      {/* Report Verification Inbox */}
      {pendingReports.length > 0 && onChange && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-3">
                  <Inbox size={20} /> Incoming Reports ({pendingReports.length})
              </h3>
              <div className="space-y-2">
                  {pendingReports.map(report => {
                      const project = data.projects.find(p => p.id === report.projectId);
                      const judge = data.judges.find(j => j.id === report.judgeId);
                      return (
                          <div key={report.id} className="bg-white p-3 rounded shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                  <div className="font-bold text-gray-800 flex items-center gap-2">
                                      {report.type === 'no-show' ? (
                                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold uppercase">No Show?</span>
                                      ) : report.type === 'cheating' ? (
                                          <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                                              <AlertTriangle size={12} /> Cheating?
                                          </span>
                                      ) : (
                                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-bold uppercase">Busy?</span>
                                      )}
                                      Table {project?.table}: {project?.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                      Reported by {judge?.name || 'Unknown Judge'} at {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  {report.type === 'no-show' && (
                                      <button 
                                        onClick={() => confirmNoShow(report)}
                                        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-700 flex items-center gap-1"
                                      >
                                          <Check size={14} /> Verify No Show
                                      </button>
                                  )}
                                  {report.type === 'cheating' && (
                                      <button 
                                        onClick={() => confirmCheating(report)}
                                        className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-orange-700 flex items-center gap-1"
                                      >
                                          <AlertTriangle size={14} /> Confirm Flag
                                      </button>
                                  )}
                                  <button 
                                    onClick={() => dismissReport(report)}
                                    className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-300 flex items-center gap-1"
                                  >
                                      <X size={14} /> Dismiss
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-gray-800">{displayProjects.length}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">Projects</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-indigo-600">{totalJudged}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">Total Scores</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-green-500">{statusCounts.green}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">Completed</div>
        </div>
         <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-red-500">{statusCounts.red}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">Not Seen</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-purple-500">{statusCounts.purple}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">No Shows</div>
        </div>
      </div>

      {/* Category Toggle */}
      <div className="flex justify-between items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 w-full">
             <button 
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                    !activeCategory 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <BarChart2 size={14}/> Overall
              </button>
              {data.organizerCategories.map(cat => (
                <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                       activeCategory === cat 
                       ? 'bg-indigo-600 text-white shadow-md' 
                       : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                   }`}
                >
                  {cat}
                </button>
              ))}
          </div>
      </div>


      {/* Live Status Section (Grid or Matrix) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
               <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {gridMode === 'simple' ? <LayoutGrid size={18} className="text-gray-400"/> : <Grid size={18} className="text-gray-400"/>} 
                        Live Status Check {activeCategory ? `(${activeCategory})` : ''}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {gridMode === 'simple' 
                            ? `Quick view of judging progress. (${displayProjects.length} projects)`
                            : "Detailed breakdown of every judge's coverage per project."
                        }
                    </p>
               </div>

               <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-sm shrink-0">
                   <button 
                       onClick={() => setGridMode('simple')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${gridMode === 'simple' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                       <LayoutGrid size={16} /> Tiles
                   </button>
                   <button 
                       onClick={() => setGridMode('matrix')}
                       className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${gridMode === 'matrix' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                       <Grid size={16} /> Matrix
                   </button>
               </div>
          </div>

          {gridMode === 'simple' ? (
              /* Simple Grid View */
              <div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> 0 Judges</div>
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div> In Progress</div>
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> Done ({data.judgesPerProject}+)</div>
                     <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div> No Show</div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {displayProjects.length === 0 && <p className="col-span-full text-center text-gray-400 text-sm py-4">No projects in this category.</p>}
                    {displayProjects.map(p => {
                        const status = getProjectStatus(p, data.scores, data.judgesPerProject);
                        const bgColors = { 
                            red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200', 
                            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200', 
                            green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
                            purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                        };
                        return (
                            <div key={p.id} className={`p-2 rounded border text-center transition-colors cursor-default ${bgColors[status]}`} title={`${p.name} (Table ${p.table})`}>
                                {p.cheating && <div className="absolute top-0 right-0 -mt-1 -mr-1"><AlertTriangle size={10} className="text-orange-500 fill-orange-100" /></div>}
                                <div className="text-xs font-bold">T-{p.table}</div>
                            </div>
                        );
                    })}
                </div>
              </div>
          ) : (
              /* Matrix View */
              <div className="overflow-x-auto border rounded border-gray-200">
                  <div className="min-w-max">
                      <div className="flex">
                          {/* Top Left Corner */}
                          <div className="w-48 p-2 border-b border-r bg-gray-50 font-bold text-xs text-gray-500 sticky left-0 z-10">Project \ Judge</div>
                          {/* Judge Headers */}
                          {data.judges.map(j => (
                              <div key={j.id} className="w-24 p-2 border-b text-center text-xs font-bold text-gray-700 truncate" title={j.name}>
                                  {j.name.split(' ')[0]}
                              </div>
                          ))}
                      </div>
                      {displayProjects.map(p => (
                          <div key={p.id} className="flex hover:bg-gray-50 transition-colors">
                              {/* Project Row Header */}
                              <div className="w-48 p-2 border-r border-b text-xs flex items-center gap-2 sticky left-0 bg-white z-10">
                                 {p.cheating && <AlertTriangle size={12} className="text-orange-500 shrink-0" />}
                                 <span className="font-mono font-bold text-gray-500 w-8">{p.table}</span>
                                 <span className="truncate w-32" title={p.name}>{p.name}</span>
                              </div>
                              {/* Grid Cells */}
                              {data.judges.map(j => {
                                  const isNoShow = p.noShow;
                                  const assignment = data.assignments?.find(a => a.judgeId === j.id && a.projectId === p.id);
                                  const score = data.scores.find(s => s.judgeId === j.id && s.projectId === p.id);
                                  
                                  let cellClass = "bg-gray-50"; // Default empty
                                  
                                  if (isNoShow) {
                                      cellClass = "bg-purple-100";
                                  } else if (assignment) {
                                      if (score) {
                                          cellClass = "bg-green-500"; // Scored & Assigned
                                      } else {
                                          cellClass = "bg-red-400"; // Assigned, Pending
                                      }
                                  } else if (score) {
                                      cellClass = "bg-green-200"; // Scored but not assigned (rogue judge?)
                                  }

                                  return (
                                      <div key={`${p.id}-${j.id}`} className={`w-24 border-b border-r p-2 flex items-center justify-center`}>
                                          <div className={`w-full h-4 rounded ${cellClass}`} title={`${j.name} -> ${p.name}`}></div>
                                      </div>
                                  );
                              })}
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      {/* Leaderboard Section (Always Visible) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <BarChart2 size={18} className="text-gray-400"/> 
                    {activeCategory ? `${activeCategory} Leaderboard` : 'Overall Leaderboard'}
                </h3>
                <button onClick={downloadCSV} className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
                    <Download size={14}/> Export CSV
                </button>
            </div>
            
            {activeCategory === null && (
                <div className="mb-4 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                    Note: Overall leaderboard scores exclude category-specific criteria to ensure fairness. Points are awarded based on each judge's personal Top 5 (1st=5pts...5th=1pt).
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Table</th>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3 text-right">Judged</th>
                            <th className="px-4 py-3 text-right">Rank Points</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {leaderboard.slice(0, 10).map((p, i) => (
                            <tr key={p.projectId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold text-gray-400">#{i + 1}</td>
                                <td className="px-4 py-3 font-mono">{p.table}</td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    {p.projectName}
                                    {activeCategory && (
                                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{activeCategory}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.timesJudged >= data.judgesPerProject ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                        {p.timesJudged}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-600">{p.rankPoints}</td>
                            </tr>
                        ))}
                        {leaderboard.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-6 text-gray-400">No scores yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">Showing top 10 rows. Export for full details.</p>
        </div>
    </div>
  );
};
