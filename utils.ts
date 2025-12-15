import { HackathonData, StressTestResult, OrganizerRoleType, Project, Score, Criterion } from './types';

// Helper to calculate minutes between two ISO date strings
const getDiffInMinutes = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  return (d2.getTime() - d1.getTime()) / (1000 * 60);
};

export const runStressTest = (data: HackathonData): StressTestResult => {
  const errors: string[] = [];

  // 1. Calculated Quantities
  const rawJudges = data.judges.length;
  // Reduce by 20% for no-shows, ceiling rounded
  const effectiveJudges = Math.ceil(rawJudges * 0.8);
  
  // Projects = check-ins / 5 (ceiling)
  const projectedProjects = Math.ceil((data.estimatedCheckIns || 0) / 5);
  
  const totalJudgingTime = getDiffInMinutes(data.judgingStart, data.judgingEnd);
  
  // Formula for Time taken by Judge per project (t):
  // J = ceil((P * n * t) / T)  => t = (J * T) / (P * n) approximately, checking capacity.
  // Actually, we calculate max feasible time 't' with available judges.
  // t = (EffectiveJudges * TotalTime) / (Projects * Rounds)
  let timePerProject = 0;
  if (projectedProjects > 0 && data.judgesPerProject > 0) {
    timePerProject = (effectiveJudges * totalJudgingTime) / (projectedProjects * data.judgesPerProject);
  }

  // --- Constraints ---

  // (A) Time between projects cannot be less than 5 minutes
  // Note: The prompt implies checking if the allocated time allows for > 5 mins per project
  if (timePerProject < 5) {
    errors.push(`(A) Violation: Calculated time per project is ${timePerProject.toFixed(1)} minutes, which is less than the required 5 minutes. Recommendations: Increase judges (need approx ${Math.ceil((projectedProjects * data.judgesPerProject * 5) / totalJudgingTime)} total effective), increase judging duration, or decrease rounds.`);
  }

  // (B) Projected number of submissions <= number of table spots
  if (projectedProjects > data.tableCount) {
    errors.push(`(B) Violation: You have ${data.tableCount} table spots but are projecting ${projectedProjects} projects. Increase table capacity.`);
  }

  // (C) 30 min between judge arrival and judge orientation
  const arrivalToOrientation = getDiffInMinutes(data.judgeArrival, data.judgeOrientation);
  if (arrivalToOrientation < 30) {
    errors.push(`(C) Violation: Only ${arrivalToOrientation} mins between Judge Arrival and Orientation. Must be at least 30 mins.`);
  }

  // (D) 1 hour between judging orientation and judging start
  const orientationToStart = getDiffInMinutes(data.judgeOrientation, data.judgingStart);
  if (orientationToStart < 60) {
    errors.push(`(D) Violation: Only ${orientationToStart} mins between Orientation and Judging Start. Must be at least 60 mins.`);
  }

  // (E) Hard submission deadline must be 1 hour before judging begins
  const hardDeadlineToStart = getDiffInMinutes(data.hardDeadline, data.judgingStart);
  if (Math.abs(hardDeadlineToStart - 60) > 5) { // Allow small margin, strict 1 hour
     if (hardDeadlineToStart < 60) errors.push(`(E) Violation: Hard deadline is too close to judging start (${hardDeadlineToStart} mins). Must be at least 60 mins before.`);
  }

  // (F) Judging period must be at least 1.5 hours long (90 mins)
  if (totalJudgingTime < 90) {
    errors.push(`(F) Violation: Judging period is ${totalJudgingTime} mins. Must be at least 90 mins.`);
  }

  // (G) Number of table spaces must be no less than 1.3 times the number of submitted projects (rounded up)
  const requiredTables = Math.ceil(projectedProjects * 1.3);
  if (data.tableCount < requiredTables) {
    errors.push(`(G) Violation: You have ${data.tableCount} tables. Recommendation for spacing: You need at least ${requiredTables} (${projectedProjects} projects * 1.3).`);
  }

  // (H) Soft deadline must be at least 1 hour before the hard deadline
  const softToHard = getDiffInMinutes(data.softDeadline, data.hardDeadline);
  if (softToHard < 60) {
    errors.push(`(H) Violation: Soft deadline is only ${softToHard} mins before Hard deadline. Must be at least 60 mins.`);
  }

  // (I) At least 1 hour between judging ending and closing ceremony starting
  const judgeEndToClosing = getDiffInMinutes(data.judgingEnd, data.closingCeremony);
  if (judgeEndToClosing < 60) {
    errors.push(`(I) Violation: Only ${judgeEndToClosing} mins between Judging End and Closing Ceremony. Must be at least 60 mins.`);
  }

  // (J) At least 1 hour between closing ceremony start time and venue closing time
  const closingToVenue = getDiffInMinutes(data.closingCeremony, data.venueHardCutoff);
  if (closingToVenue < 60) {
    errors.push(`(J) Violation: Only ${closingToVenue} mins between Closing Ceremony Start and Venue Cutoff. Must be at least 60 mins.`);
  }

  // (K) Judges per project cannot be lower than 2
  if (data.judgesPerProject < 2) {
    errors.push(`(K) Violation: You have set ${data.judgesPerProject} judges/rounds per project. Must be at least 2.`);
  }

  // (L) The same organizer cannot be assigned to multiple roles
  const roles = new Map<string, string[]>(); // Phone -> Roles
  data.organizers.forEach(org => {
    const existing = roles.get(org.phone) || [];
    existing.push(org.role);
    roles.set(org.phone, existing);
  });
  
  // Check if all required roles are filled (optional based on prompt implication, but good for validation)
  const requiredRoles = Object.values(OrganizerRoleType);
  const filledRoles = new Set(data.organizers.map(o => o.role));
  
  requiredRoles.forEach(role => {
      if(!filledRoles.has(role)) {
          errors.push(`(L) Violation: Role "${role}" is not assigned to anyone.`);
      }
  });

  roles.forEach((orgRoles, phone) => {
    if (orgRoles.length > 1) {
      const orgName = data.organizers.find(o => o.phone === phone)?.name || "Unknown";
      errors.push(`(L) Violation: Organizer ${orgName} (${phone}) is assigned to multiple roles: ${orgRoles.join(', ')}. Assign additional organizers.`);
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    metrics: {
      effectiveJudges,
      projectedProjects,
      timePerProject,
      totalJudgingTime,
      rounds: data.judgesPerProject
    }
  };
};

export const formatTime = (isoString: string) => {
  if (!isoString) return "--:--";
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Live Operations Helpers ---

export type ProjectStatus = 'red' | 'yellow' | 'green' | 'purple';

export const getProjectStatus = (project: Project, scores: Score[], requiredRounds: number): ProjectStatus => {
  if (project.noShow) return 'purple';
  const timesJudged = scores.filter(s => s.projectId === project.id).length;
  if (timesJudged === 0) return 'red';
  if (timesJudged < requiredRounds) return 'yellow';
  return 'green';
};

export interface ProjectScoreStats {
  projectId: string;
  projectName: string;
  table: string;
  timesJudged: number;
  avgScore: number;
  totalScore: number;
}

export const calculateLeaderboard = (projects: Project[], scores: Score[], criteria: Criterion[]): ProjectScoreStats[] => {
  return projects
    .filter(p => !p.noShow) // Exclude No Shows
    .map(p => {
      const projectScores = scores.filter(s => s.projectId === p.id);
      if (projectScores.length === 0) {
        return { projectId: p.id, projectName: p.name, table: p.table, timesJudged: 0, avgScore: 0, totalScore: 0 };
      }

      let totalPoints = 0;
      projectScores.forEach(s => {
        // Sum all criteria for this score entry
        const scoreSum = Object.values(s.criteria).reduce((a, b) => a + b, 0);
        totalPoints += scoreSum;
      });
      
      // Normalize? For now just raw average across all criteria entries
      // Total max possible score per judge = criteria.length * 3
      
      return {
        projectId: p.id,
        projectName: p.name,
        table: p.table,
        timesJudged: projectScores.length,
        totalScore: totalPoints,
        avgScore: totalPoints / projectScores.length
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
};