import React, { useState, useEffect } from 'react';
import { HackathonData, INITIAL_DATA, StressTestResult } from './types';
import { runStressTest } from './utils';
import { PreEventForm } from './components/PreEventForm';
import { StressTestReport } from './components/StressTestReport';
import { DayOfPhase } from './components/DayOfPhase';
import { GameTimePhase } from './components/GameTimePhase';
import { ProjectManager } from './components/ProjectManager';
import { JudgePortal } from './components/JudgePortal';
import { LiveDashboard } from './components/LiveDashboard';
import { Calendar, ClipboardList, Activity, LayoutDashboard, Menu, X, Users, Database, BarChart } from 'lucide-react';

const STORAGE_KEY = 'judgeplan_pro_data_v1';

enum View {
  PLANNING = 'PLANNING',
  PROJECTS = 'PROJECTS',
  JUDGE_PORTAL = 'JUDGE_PORTAL',
  DASHBOARD = 'DASHBOARD'
}

const App: React.FC = () => {
  const [data, setData] = useState<HackathonData>(INITIAL_DATA);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.PLANNING);
  const [planningSubTab, setPlanningSubTab] = useState<'PRE' | 'DAY' | 'GAME'>('PRE');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new fields exist if loading old data
        const merged = { ...INITIAL_DATA, ...parsed };
        // Ensure arrays are arrays (legacy check)
        merged.projects = Array.isArray(merged.projects) ? merged.projects : [];
        merged.scores = Array.isArray(merged.scores) ? merged.scores : [];
        setData(merged);
      } catch (e) {
        console.error("Failed to load saved data");
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleRunTest = () => {
    const res = runStressTest(data);
    setResult(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const NavButton = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors w-full md:w-auto ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-700">
            <LayoutDashboard className="text-indigo-600"/>
            <span className="hidden sm:inline">JudgePlan Pro</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1">
            <NavButton view={View.PLANNING} icon={ClipboardList} label="Planning" />
            <NavButton view={View.PROJECTS} icon={Database} label="Projects" />
            <NavButton view={View.JUDGE_PORTAL} icon={Users} label="Judge Portal" />
            <NavButton view={View.DASHBOARD} icon={BarChart} label="Live Dashboard" />
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-gray-600 rounded hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 space-y-2 shadow-lg">
             <NavButton view={View.PLANNING} icon={ClipboardList} label="Planning" />
             <NavButton view={View.PROJECTS} icon={Database} label="Projects" />
             <NavButton view={View.JUDGE_PORTAL} icon={Users} label="Judge Portal" />
             <NavButton view={View.DASHBOARD} icon={BarChart} label="Live Dashboard" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        
        {currentView === View.PLANNING && (
          <div className="animate-fade-in">
             {/* Sub-tabs for Planning phases */}
             <div className="flex border-b mb-6 overflow-x-auto">
               <button 
                onClick={() => setPlanningSubTab('PRE')}
                className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${planningSubTab === 'PRE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                 Pre-Event
               </button>
               <button 
                onClick={() => setPlanningSubTab('DAY')}
                className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${planningSubTab === 'DAY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                 Day Of
               </button>
               <button 
                onClick={() => setPlanningSubTab('GAME')}
                className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${planningSubTab === 'GAME' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                 Gametime Metrics
               </button>
             </div>

            {planningSubTab === 'PRE' && (
              <>
                {result && result.passed ? (
                  <StressTestReport 
                    data={data} 
                    result={result} 
                    onEdit={() => setResult(null)} 
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    {result && !result.passed && (
                      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
                        <p className="font-bold">Stress Test Failed</p>
                        <p className="text-sm">See errors below or check inputs.</p>
                        <ul className="list-disc ml-5 mt-2 text-sm">
                            {result.errors.map((e,i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    <PreEventForm 
                      data={data} 
                      onChange={setData} 
                      onRunTest={handleRunTest} 
                    />
                  </div>
                )}
              </>
            )}

            {planningSubTab === 'DAY' && <DayOfPhase data={data} onChange={setData} />}
            {planningSubTab === 'GAME' && <GameTimePhase data={data} onChange={setData} />}
          </div>
        )}

        {currentView === View.PROJECTS && <ProjectManager data={data} onChange={setData} />}
        
        {currentView === View.JUDGE_PORTAL && <JudgePortal data={data} onChange={setData} />}
        
        {currentView === View.DASHBOARD && <LiveDashboard data={data} />}

      </main>
      
      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm">
        <p>© {new Date().getFullYear()} JudgePlan Pro. Local-first. Mobile-optimized.</p>
      </footer>
    </div>
  );
};

export default App;