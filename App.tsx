import React, { useState, useEffect } from 'react';
import { HackathonData, INITIAL_DATA, StressTestResult, UserRole, OrganizerRoleType } from './types';
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
  LogOut,
  ArrowRight,
  Key,
  UserCheck,
  Building,
  PlusCircle,
  Lock
} from 'lucide-react';

const DB_KEY = 'judgeplan_db_v3';
const LEGACY_KEY = 'judgeplan_pro_data_v2';

enum View {
  PLANNING = 'PLANNING',
  PROJECTS = 'PROJECTS',
  JUDGE_PORTAL = 'JUDGE_PORTAL',
  DASHBOARD = 'DASHBOARD',
  PUBLIC_DIRECTORY = 'PUBLIC_DIRECTORY'
}

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
  // Global DB State
  const [events, setEvents] = useState<HackathonData[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Auth State
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<{name: string, id?: string} | null>(null);

  // UI Flow State
  const [authStep, setAuthStep] = useState<'ROLE_SELECT' | 'MLH_LOGIN' | 'EVENT_SELECT' | 'CREDENTIALS' | 'MLH_DASHBOARD'>('ROLE_SELECT');
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRole | null>(null);
  
  // Login Form Inputs
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [mlhUser, setMlhUser] = useState('');
  const [mlhPass, setMlhPass] = useState('');

  // MLH Creation Inputs
  const [newEventName, setNewEventName] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');

  // Navigation State
  const [currentView, setCurrentView] = useState<View>(View.PLANNING);
  const [planningSubTab, setPlanningSubTab] = useState<'PRE' | 'DAY' | 'GAME'>('PRE');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [result, setResult] = useState<StressTestResult | null>(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    // Load DB
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
        try {
            setEvents(JSON.parse(raw));
        } catch (e) {
            console.error("Failed to parse DB", e);
        }
    } else {
        // Migration Check
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
            try {
                const parsed = JSON.parse(legacy);
                // Ensure array fields exist
                const migrated: HackathonData = {
                    ...INITIAL_DATA,
                    ...parsed,
                    id: 'legacy-' + Date.now(),
                    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
                    scores: Array.isArray(parsed.scores) ? parsed.scores : [],
                    reports: Array.isArray(parsed.reports) ? parsed.reports : [],
                };
                setEvents([migrated]);
            } catch (e) { console.error(e); }
        }
    }
  }, []);

  // Save DB on change
  useEffect(() => {
    if (events.length > 0) {
        localStorage.setItem(DB_KEY, JSON.stringify(events));
    }
  }, [events]);

  // Derived state
  const activeEventData = events.find(e => e.id === activeEventId);

  // --- HANDLERS ---

  const updateActiveEvent = (newData: HackathonData) => {
    setEvents(prev => prev.map(e => e.id === newData.id ? newData : e));
  };

  const handleRunTest = () => {
    if (!activeEventData) return;
    const res = runStressTest(activeEventData);
    setResult(res);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoggedInUser(null);
    setActiveEventId(null);
    setAuthStep('ROLE_SELECT');
    setLoginName('');
    setLoginPhone('');
    setMlhUser('');
    setMlhPass('');
  };

  // --- AUTH LOGIC ---

  const handleMlhLogin = () => {
      if (mlhUser === 'mlh' && mlhPass === 'empowerhackers') {
          setUserRole('MLH');
          setAuthStep('MLH_DASHBOARD');
      } else {
          alert('Invalid MLH Credentials');
      }
  };

  const handleMlhCreateEvent = () => {
      if (!newEventName || !newOrgName || !newOrgPhone) {
          alert("All fields required");
          return;
      }
      
      // Prepare default organizers, replacing the generic 'Organizer' slot with the creator
      const defaultOrgs = INITIAL_DATA.organizers
        .filter(o => o.role !== OrganizerRoleType.GENERAL) // Remove generic placeholder
        .map(o => ({...o})); // Deep copy remaining placeholders

      const creatorOrg = {
          name: newOrgName,
          phone: newOrgPhone,
          role: OrganizerRoleType.GENERAL,
          email: ''
      };

      const newEvent: HackathonData = {
          ...INITIAL_DATA,
          id: `evt-${Date.now()}`,
          eventName: newEventName,
          organizers: [creatorOrg, ...defaultOrgs], // Creator first, then specific roles
          judges: [...INITIAL_DATA.judges], // Use the default 15 judges from types.ts
          projects: [] 
      };

      setEvents(prev => [...prev, newEvent]);
      setNewEventName('');
      setNewOrgName('');
      setNewOrgPhone('');
      alert(`Event "${newEventName}" created! Includes 15 default judges.`);
  };

  const handleEventSelection = (eId: string) => {
      setActiveEventId(eId);
      if (selectedRoleForLogin === 'HACKER') {
          setUserRole('HACKER');
          setCurrentView(View.PUBLIC_DIRECTORY);
          // Hacker is logged in now
      } else {
          setAuthStep('CREDENTIALS');
      }
  };

  const handleUserLogin = () => {
      if (!activeEventData) return;

      if (selectedRoleForLogin === 'ADMIN') {
          const org = activeEventData.organizers.find(o => o.name === loginName && o.phone === loginPhone);
          if (org) {
              setUserRole('ADMIN');
              setLoggedInUser({ name: org.name });
              setCurrentView(View.PLANNING);
          } else {
              alert("Invalid Organizer Name or Password.");
          }
      } else if (selectedRoleForLogin === 'JUDGE') {
          const judge = activeEventData.judges.find(j => j.name === loginName && j.phone === loginPhone);
          if (judge) {
              setUserRole('JUDGE');
              setLoggedInUser({ name: judge.name, id: judge.id });
              setCurrentView(View.JUDGE_PORTAL);
          } else {
              alert("Invalid Judge Name or Password.");
          }
      }
  };

  // --- NAVIGATION ---

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
  const showHeader = userRole !== 'HACKER' && userRole !== 'MLH' && userRole !== null;

  // --- RENDER: AUTH SCREENS ---

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-fade-in font-sans">
        <div className="max-w-md w-full">
            <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <LayoutDashboard className="w-12 h-12 text-indigo-600" />
                    <h1 className="text-4xl font-black text-gray-900">JudgePlan Pro</h1>
                </div>
                <p className="text-gray-500">Hackathon judging logistics, simplified.</p>
            </div>

            {authStep === 'ROLE_SELECT' && (
                <div className="space-y-4">
                    <button 
                        onClick={() => { setSelectedRoleForLogin('ADMIN'); setAuthStep('EVENT_SELECT'); }}
                        className="w-full bg-white p-4 rounded-xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-4 group text-left"
                    >
                        <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-600 transition-colors">
                            <Shield className="text-indigo-600 group-hover:text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Organizer Login</h3>
                            <p className="text-xs text-gray-500">Manage event, projects & schedule</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600" />
                    </button>

                    <button 
                        onClick={() => { setSelectedRoleForLogin('JUDGE'); setAuthStep('EVENT_SELECT'); }}
                        className="w-full bg-white p-4 rounded-xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-4 group text-left"
                    >
                        <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-600 transition-colors">
                            <Gavel className="text-green-600 group-hover:text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Judge Login</h3>
                            <p className="text-xs text-gray-500">Score projects & view assignments</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600" />
                    </button>

                    <button 
                        onClick={() => { setSelectedRoleForLogin('HACKER'); setAuthStep('EVENT_SELECT'); }}
                        className="w-full bg-white p-4 rounded-xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-4 group text-left"
                    >
                        <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-600 transition-colors">
                            <MapPin className="text-purple-600 group-hover:text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Hacker Directory</h3>
                            <p className="text-xs text-gray-500">Find table numbers & maps</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600" />
                    </button>

                    <div className="pt-8 text-center">
                        <button 
                            onClick={() => setAuthStep('MLH_LOGIN')}
                            className="text-xs text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto"
                        >
                            <Lock size={12} /> Super Admin (MLH)
                        </button>
                    </div>
                </div>
            )}

            {authStep === 'MLH_LOGIN' && (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                     <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => setAuthStep('ROLE_SELECT')} className="text-gray-400 hover:text-gray-600"><ArrowRight className="rotate-180" /></button>
                        <h2 className="text-xl font-bold">Super Admin</h2>
                    </div>
                    <div className="space-y-4">
                        <input 
                            placeholder="Username"
                            className="w-full p-2 border rounded"
                            value={mlhUser}
                            onChange={e => setMlhUser(e.target.value)}
                        />
                         <input 
                            type="password"
                            placeholder="Password"
                            className="w-full p-2 border rounded"
                            value={mlhPass}
                            onChange={e => setMlhPass(e.target.value)}
                        />
                        <button 
                            onClick={handleMlhLogin}
                            className="w-full bg-indigo-600 text-white py-2 rounded font-bold"
                        >
                            Login
                        </button>
                    </div>
                </div>
            )}

            {authStep === 'EVENT_SELECT' && (
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => setAuthStep('ROLE_SELECT')} className="text-gray-400 hover:text-gray-600"><ArrowRight className="rotate-180" /></button>
                        <h2 className="text-xl font-bold">Select Event</h2>
                    </div>
                    
                    {events.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                            No events found. Contact MLH Super Admin.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {events.map(ev => (
                                <button
                                    key={ev.id}
                                    onClick={() => handleEventSelection(ev.id)}
                                    className="w-full p-4 text-left border rounded hover:border-indigo-500 hover:bg-indigo-50 transition-colors font-medium flex justify-between items-center"
                                >
                                    {ev.eventName || 'Untitled Event'}
                                    <ArrowRight size={16} className="text-gray-300" />
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
            )}

            {authStep === 'CREDENTIALS' && activeEventData && (
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => { setActiveEventId(null); setAuthStep('EVENT_SELECT'); }} className="text-gray-400 hover:text-gray-600"><ArrowRight className="rotate-180" /></button>
                        <div>
                            <h2 className="text-xl font-bold">{selectedRoleForLogin === 'ADMIN' ? 'Organizer' : 'Judge'} Login</h2>
                            <p className="text-xs text-indigo-600 font-bold">{activeEventData.eventName}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Name</label>
                            <div className="relative">
                                <UserCheck className="absolute left-3 top-3 text-gray-400" size={18} />
                                <select 
                                    className="w-full p-2.5 pl-10 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={loginName}
                                    onChange={(e) => setLoginName(e.target.value)}
                                >
                                    <option value="">-- Select Your Name --</option>
                                    {selectedRoleForLogin === 'ADMIN' 
                                        ? activeEventData.organizers.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)
                                        : activeEventData.judges.map(j => <option key={j.id} value={j.name}>{j.name}</option>)
                                    }
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="password"
                                    placeholder="Enter Password"
                                    className="w-full p-2.5 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={loginPhone}
                                    onChange={(e) => setLoginPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleUserLogin}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md mt-2"
                        >
                            Log In
                        </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
    );
  }

  // --- RENDER: MLH DASHBOARD ---

  if (userRole === 'MLH') {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-gray-900 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <Lock className="text-yellow-400" />
                        MLH Super Admin
                    </div>
                    <button onClick={handleLogout} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors">
                        Logout
                    </button>
                </div>
            </header>
            
            <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8">
                {/* Create Event */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <PlusCircle /> Create New Event
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Event Name</label>
                            <input 
                                className="w-full p-2 border rounded"
                                placeholder="HackMIT 2025"
                                value={newEventName}
                                onChange={e => setNewEventName(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Organizer Name</label>
                             <input 
                                className="w-full p-2 border rounded"
                                placeholder="Jane Doe"
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Organizer Phone</label>
                             <input 
                                className="w-full p-2 border rounded"
                                placeholder="Used as login password"
                                value={newOrgPhone}
                                onChange={e => setNewOrgPhone(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handleMlhCreateEvent}
                            className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 shadow-sm"
                        >
                            Initialize Event
                        </button>
                    </div>
                </div>

                {/* Existing Events List */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Database /> Existing Events
                    </h2>
                    {events.length === 0 ? (
                        <p className="text-gray-500 italic">No events created yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {events.map(ev => (
                                <div key={ev.id} className="p-4 border rounded bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-lg text-gray-900">{ev.eventName}</div>
                                        <div className="text-xs text-gray-500">
                                            Projects: {ev.projects.length} | Organizers: {ev.organizers.length} | ID: {ev.id}
                                        </div>
                                    </div>
                                    {/* Potential future feature: Delete event */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
      );
  }

  // --- RENDER: EVENT VIEW (Org/Judge/Hacker) ---

  if (!activeEventData) return null; // Should not happen if userRole is set for these roles

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header - Hidden for Hacker Role */}
      {showHeader && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-indigo-700">
              <LayoutDashboard className="text-indigo-600"/>
              <span className="hidden sm:inline">
                {activeEventData.eventName || 'JudgePlan Pro'}
              </span>
              {loggedInUser && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2 hidden md:inline">Hi, {loggedInUser.name}</span>}
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
               <div className="text-xs font-bold text-gray-400 uppercase py-1">Logged in as {loggedInUser?.name}</div>
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
                  <span>Log Out</span>
                </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full ${showHeader ? 'max-w-4xl mx-auto p-4 md:p-8' : ''}`}>
        
        {/* PUBLIC DIRECTORY for Hackers */}
        {currentView === View.PUBLIC_DIRECTORY && (
            <PublicDirectory 
                data={activeEventData} 
                onExit={userRole === 'HACKER' ? handleLogout : undefined} 
            />
        )}

        {/* ADMIN VIEWS */}
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
                    data={activeEventData} 
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
                      data={activeEventData} 
                      onChange={updateActiveEvent} 
                      onRunTest={handleRunTest} 
                    />
                  </div>
                )}
              </>
            )}

            {planningSubTab === 'DAY' && <DayOfPhase data={activeEventData} onChange={updateActiveEvent} />}
            {planningSubTab === 'GAME' && <GameTimePhase data={activeEventData} onChange={updateActiveEvent} />}
          </div>
        )}

        {(currentView === View.PROJECTS && userRole === 'ADMIN') && 
            <ProjectManager data={activeEventData} onChange={updateActiveEvent} />
        }
        
        {((currentView === View.JUDGE_PORTAL && (userRole === 'ADMIN' || userRole === 'JUDGE'))) && 
            <JudgePortal 
                data={activeEventData} 
                onChange={updateActiveEvent} 
                currentUser={loggedInUser}
                userRole={userRole}
            />
        }
        
        {(currentView === View.DASHBOARD && userRole === 'ADMIN') && 
            <LiveDashboard data={activeEventData} onChange={updateActiveEvent} />
        }

      </main>
      
      {showHeader && (
        <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm">
          <p>© {new Date().getFullYear()} JudgePlan Pro.</p>
        </footer>
      )}
    </div>
  );
};

export default App;