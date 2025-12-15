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
import { PublicDirectory } from './components/PublicDirectory';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Menu, 
  X, 
  Users, 
  Database, 
  BarChart, 
  MapPin, 
  Shield, 
  Gavel, 
  LogOut 
} from 'lucide-react';

const STORAGE_KEY = 'judgeplan_pro_data_v2';

enum View {
  PLANNING = 'PLANNING',
  PROJECTS = 'PROJECTS',
  JUDGE_PORTAL = 'JUDGE_PORTAL',
  DASHBOARD = 'DASHBOARD',
  PUBLIC_DIRECTORY = 'PUBLIC_DIRECTORY'
}

type UserRole = 'ADMIN' | 'JUDGE' | 'HACKER';

interface NavButtonProps { 
  view: View; 
  icon: any; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ view, icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors w-full md:w-auto ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const App: React.FC = () => {
  const [data, setData] = useState<HackathonData>(INITIAL_DATA);
  const [result, setResult] = useState<StressTestResult | null>(null);
  
  // Role State
  const [userRole, setUserRole] = useState<UserRole | null>(null);
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

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    if (role === 'ADMIN') setCurrentView(View.PLANNING);
    if (role === 'JUDGE') setCurrentView(View.JUDGE_PORTAL);
    if (role === 'HACKER') setCurrentView(View.PUBLIC_DIRECTORY);
  };

  const handleLogout = () => {
    setUserRole(null);
    setIsMobileMenuOpen(false);
  };

  // Define available views based on Role
  const getNavItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { view: View.PLANNING, icon: ClipboardList, label: 'Planning' },
          { view: View.PROJECTS, icon: Database, label: 'Projects' },
          { view: View.JUDGE_PORTAL, icon: Users, label: 'Judge Portal' },
          { view: View.DASHBOARD, icon: BarChart, label: 'Live Dashboard' },
          { view: View.PUBLIC_DIRECTORY, icon: MapPin, label: 'Directory' }
        ];
      case 'JUDGE':
        return [
          { view: View.JUDGE_PORTAL, icon: Users, label: 'Judge Portal' },
          { view: View.PUBLIC_DIRECTORY, icon: MapPin, label: 'Directory' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const showHeader = userRole !== 'HACKER';

  // --- ROLE SELECTION SCREEN ---
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
             <LayoutDashboard className="w-10 h-10 text-indigo-600" />
             <h1 className="text-4xl font-black text-gray-900">JudgePlan Pro</h1>
          </div>
          <p className="text-gray-500 text-lg">Select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
          {/* Admin */}
          <button 
            onClick={() => handleRoleSelect('ADMIN')}
            className="bg-white p-8 rounded-xl shadow-md border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
          >
            <div className="bg-indigo-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
               <Shield className="w-8 h-8 text-indigo-600 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Organizer</h2>
            <p className="text-gray-500">Full access. Manage schedule, stress test, import projects, and view live metrics.</p>
          </button>

          {/* Judge */}
          <button 
            onClick={() => handleRoleSelect('JUDGE')}
            className="bg-white p-8 rounded-xl shadow-md border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
          >
            <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
               <Gavel className="w-8 h-8 text-green-600 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Judge</h2>
            <p className="text-gray-500">Access your scoring portal, view assigned tables, and submit project scores.</p>
          </button>

           {/* Hacker */}
           <button 
            onClick={() => handleRoleSelect('HACKER')}
            className="bg-white p-8 rounded-xl shadow-md border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-left"
          >
            <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
               <MapPin className="w-8 h-8 text-purple-600 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hacker</h2>
            <p className="text-gray-500">Public directory. Find table numbers, project details, and categories.</p>
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header - Hidden for Hacker Role */}
      {showHeader && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-indigo-700">
              <LayoutDashboard className="text-indigo-600"/>
              <span className="hidden sm:inline">
                {userRole === 'ADMIN' ? 'JudgePlan Pro' : 'Judging Portal'}
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-1 items-center">
              {navItems.map(item => (
                <NavButton 
                  key={item.label} 
                  view={item.view} 
                  icon={item.icon} 
                  label={item.label}
                  isActive={currentView === item.view}
                  onClick={() => {
                    setCurrentView(item.view);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ))}
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
              >
                <LogOut size={16} />
                Exit
              </button>
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
               {navItems.map(item => (
                 <NavButton 
                    key={item.label} 
                    view={item.view} 
                    icon={item.icon} 
                    label={item.label}
                    isActive={currentView === item.view}
                    onClick={() => {
                      setCurrentView(item.view);
                      setIsMobileMenuOpen(false);
                    }}
                  />
               ))}
               <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                >
                  <LogOut size={18} />
                  <span>Exit Role</span>
                </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full ${showHeader ? 'max-w-4xl mx-auto p-4 md:p-8' : ''}`}>
        
        {currentView === View.PLANNING && userRole === 'ADMIN' && (
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

        {(currentView === View.PROJECTS && userRole === 'ADMIN') && 
            <ProjectManager data={data} onChange={setData} />
        }
        
        {((currentView === View.JUDGE_PORTAL && (userRole === 'ADMIN' || userRole === 'JUDGE'))) && 
            <JudgePortal data={data} onChange={setData} />
        }
        
        {(currentView === View.DASHBOARD && userRole === 'ADMIN') && 
            <LiveDashboard data={data} />
        }

        {currentView === View.PUBLIC_DIRECTORY && (
            <PublicDirectory 
                data={data} 
                onExit={userRole === 'HACKER' ? handleLogout : undefined} 
            />
        )}

      </main>
      
      {showHeader && (
        <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm">
          <p>© {new Date().getFullYear()} JudgePlan Pro. Local-first. Mobile-optimized.</p>
        </footer>
      )}
    </div>
  );
};

export default App;