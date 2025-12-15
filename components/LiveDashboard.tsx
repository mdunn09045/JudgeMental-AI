import React from 'react';
import { HackathonData } from '../types';
import { getProjectStatus, calculateLeaderboard, ProjectStatus } from '../utils';
import { BarChart2, Download, RefreshCw } from 'lucide-react';

interface Props {
  data: HackathonData;
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

export const LiveDashboard: React.FC<Props> = ({ data }) => {
  const leaderboard = calculateLeaderboard(data.projects, data.scores, data.criteria);
  const totalJudged = data.scores.length;
  
  // Calculate progress stats
  const statusCounts = { red: 0, yellow: 0, green: 0, purple: 0 };
  data.projects.forEach(p => {
    const status = getProjectStatus(p, data.scores, data.judgesPerProject);
    statusCounts[status]++;
  });

  const downloadCSV = () => {
    // Simple CSV export of leaderboard
    const headers = ['Rank', 'Table', 'Project Name', 'Times Judged', 'Avg Score', 'Total Score'];
    const rows = leaderboard.map((p, i) => [
        i + 1,
        p.table,
        p.projectName,
        p.timesJudged,
        p.avgScore.toFixed(2),
        p.totalScore
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "judging_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded shadow-sm border text-center">
            <div className="text-2xl font-bold text-gray-800">{data.projects.length}</div>
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

      {/* Visual Grid */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <RefreshCw size={18} className="text-gray-400"/> Live Status Grid
        </h3>
        <p className="text-xs text-gray-500 mb-4">
            Red: 0 judges. Yellow: In progress. Green: Done ({data.judgesPerProject}+ judges). Purple: No Show.
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {data.projects.map(p => {
                const status = getProjectStatus(p, data.scores, data.judgesPerProject);
                const bgColors = { 
                  red: 'bg-red-100 text-red-800 border-red-200', 
                  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
                  green: 'bg-green-100 text-green-800 border-green-200',
                  purple: 'bg-purple-100 text-purple-800 border-purple-200'
                };
                return (
                    <div key={p.id} className={`p-2 rounded border text-center ${bgColors[status]}`} title={p.name}>
                        <div className="text-xs font-bold">T-{p.table}</div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart2 size={18} className="text-gray-400"/> Live Leaderboard
            </h3>
            <button onClick={downloadCSV} className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
                <Download size={14}/> Export CSV
            </button>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3 text-right">Judged</th>
                        <th className="px-4 py-3 text-right">Avg Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {leaderboard.slice(0, 10).map((p, i) => (
                        <tr key={p.projectId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-400">#{i + 1}</td>
                            <td className="px-4 py-3 font-mono">{p.table}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{p.projectName}</td>
                            <td className="px-4 py-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.timesJudged >= data.judgesPerProject ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                    {p.timesJudged}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-indigo-600">{p.avgScore.toFixed(2)}</td>
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