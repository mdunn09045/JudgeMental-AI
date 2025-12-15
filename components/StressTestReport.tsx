import React from 'react';
import { HackathonData, StressTestResult } from '../types';
import { formatTime } from '../utils';
import { CheckCircle, XCircle, Download } from 'lucide-react';

interface Props {
  data: HackathonData;
  result: StressTestResult;
  onEdit: () => void;
}

export const StressTestReport: React.FC<Props> = ({ data, result, onEdit }) => {
  const downloadJson = () => {
    const jsonString = JSON.stringify({ data, result }, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `judging-plan-${data.eventName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!result.passed) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200 animate-fade-in">
        <div className="flex items-center gap-2 text-red-700 text-xl font-bold mb-4">
          <XCircle />
          <h2>Stress Test Failed</h2>
        </div>
        <p className="mb-4 text-red-800">Your judging plan violates specific constraints. Please address the issues below:</p>
        <ul className="space-y-3 mb-6">
          {result.errors.map((err, i) => (
            <li key={i} className="bg-white p-3 rounded shadow-sm border-l-4 border-red-500 text-sm text-gray-800">
              {err}
            </li>
          ))}
        </ul>
        <button onClick={onEdit} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
          Edit Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-700 text-2xl font-bold mb-2">
          <CheckCircle />
          <h2>Judging Plan Approved</h2>
        </div>
        <p className="text-green-800">Your plan meets all logistical and timing constraints.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Narrative Report</h3>
        <div className="prose text-gray-700 space-y-2">
          <p>
            For <strong>{data.eventName}</strong>, we are anticipating <strong>{result.metrics.projectedProjects}</strong> projects submitted from {data.estimatedCheckIns} attendees. 
            We have <strong>{result.metrics.effectiveJudges}</strong> effective judges (from {data.judges.length} total) to cover these projects.
          </p>
          <p>
            Each project will be judged <strong>{result.metrics.rounds}</strong> times. Based on a total judging window of <strong>{result.metrics.totalJudgingTime}</strong> minutes, 
            each judge will have approximately <strong>{result.metrics.timePerProject.toFixed(1)}</strong> minutes per project. This satisfies the minimum requirement of 5 minutes (3 min judging + 2 min transition).
          </p>
          <p className="text-sm bg-yellow-50 p-2 border border-yellow-100 rounded mt-4">
            <strong>Note on Scoring:</strong> The criteria defined are used for stack ranking. Raw scores are not comparable across different judges to mitigate individual biases. 
            We recommend using a normalization method (e.g., Z-Score) or simply stack ranking (Top 3) per judge to determine bubble-up finalists.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <h3 className="text-xl font-bold p-4 bg-gray-50 border-b">Run of Show</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Details / Owner</th>
              </tr>
            </thead>
            <tbody>
              {[
                { time: data.softDeadline, event: "Soft Deadline", detail: "Gallery Live. Check for missing teams." },
                { time: data.hardDeadline, event: "Hard Deadline", detail: "Submissions Closed." },
                { time: data.judgeArrival, event: "Judge Arrival", detail: "Greeting & Check-in." },
                { time: data.judgeOrientation, event: "Judge Orientation", detail: `Lead: ${data.organizers.find(o => o.role.includes("Orientation"))?.name || 'Unassigned'}` },
                { time: data.judgingStart, event: "Judging Begins", detail: `Active Judging (${result.metrics.totalJudgingTime} mins)` },
                { time: data.judgingEnd, event: "Judging Ends", detail: "Collect assignments." },
                { time: data.judgingDeliberations, event: "Deliberations", detail: "Organizer + Finalist Selection." },
                { time: data.closingCeremony, event: "Closing Ceremony", detail: "Awards & Thanks." },
                { time: data.venueHardCutoff, event: "Venue Cutoff", detail: "Hard Stop." }
              ].sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium font-mono">{formatTime(row.time)}</td>
                  <td className="px-6 py-4 font-bold">{row.event}</td>
                  <td className="px-6 py-4 text-gray-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={downloadJson} className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center justify-center gap-2">
          <Download size={18} /> Export Plan (JSON)
        </button>
        <button onClick={onEdit} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Edit/Revise
        </button>
      </div>
    </div>
  );
};
