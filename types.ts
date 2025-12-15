export enum OrganizerRoleType {
  DEVPOST = "Devpost Help",
  CLEARING = "Clearing Tables",
  TABLE_ASSIGNMENT = "Assigning Table Numbers / No Shows",
  ORIENTATION = "Judging Orientation / Help Desk",
  SLIDES = "Closing Slides Creator"
}

export interface Organizer {
  name: string;
  phone: string;
  email: string;
  role: OrganizerRoleType;
}

export interface Judge {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  scale: string;
}

export interface Project {
  id: string;
  name: string;
  table: string;
  category: string; // Main category or track
  description?: string;
  noShow?: boolean;
}

export interface Score {
  id: string;
  judgeId: string;
  projectId: string;
  criteria: Record<string, number>; // criteriaId -> score value
  note: string;
  timestamp: string;
}

export interface HackathonData {
  eventName: string;
  estimatedCheckIns: number;
  // Timestamps are stored as ISO strings
  softDeadline: string;
  hardDeadline: string;
  judgeArrival: string;
  judgeOrientation: string;
  judgingStart: string;
  judgingEnd: string;
  judgingDeliberations: string;
  closingCeremony: string;
  venueHardCutoff: string;

  tableCount: number;
  judgesPerProject: number; // 'n' in the formula
  
  judges: Judge[];
  organizers: Organizer[];
  
  sponsorCategories: string[];
  organizerCategories: string[];
  
  criteria: Criterion[];
  
  // Phase 2: Day Of
  actualCheckIns: number | null;
  confirmedJudges: number | null;
  venueChangesNote: string;

  // Phase 3: Game Time Metrics
  actualProjects: number | null;
  demoTimeMinutes: number | null;
  actualJudgesShowed: number | null;

  // Phase 3: Operations
  projects: Project[];
  scores: Score[];
}

export interface StressTestResult {
  passed: boolean;
  errors: string[];
  metrics: {
    effectiveJudges: number;
    projectedProjects: number;
    timePerProject: number;
    totalJudgingTime: number; // minutes
    rounds: number;
  };
}

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: '1', name: 'Completion', description: 'Does the hack work? Did the team achieve everything they wanted?', scale: '1-3' },
  { id: '2', name: 'Originality', description: 'Has this project been done before? How creative is it?', scale: '1-3' },
  { id: '3', name: 'Learning', description: 'Did the team stretch themselves? Did they try to learn something new?', scale: '1-3' },
  { id: '4', name: 'Design', description: 'Did the team put thought into the user experience? UI design?', scale: '1-3' },
  { id: '5', name: 'Technology', description: 'How technically impressive was the hack? Complexity?', scale: '1-3' },
  { id: '6', name: 'Organizer Category Relevance', description: 'Relevance to the specific category opted into.', scale: '1-3' },
];

export const INITIAL_DATA: HackathonData = {
  eventName: "",
  estimatedCheckIns: 0,
  softDeadline: "",
  hardDeadline: "",
  judgeArrival: "",
  judgeOrientation: "",
  judgingStart: "",
  judgingEnd: "",
  judgingDeliberations: "",
  closingCeremony: "",
  venueHardCutoff: "",
  tableCount: 0,
  judgesPerProject: 3,
  judges: [],
  organizers: [],
  sponsorCategories: [],
  organizerCategories: [],
  criteria: DEFAULT_CRITERIA,
  actualCheckIns: null,
  confirmedJudges: null,
  venueChangesNote: "",
  actualProjects: null,
  demoTimeMinutes: null,
  actualJudgesShowed: null,
  projects: [],
  scores: [],
};