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
  rankPoints: number; // Stack ranking points
  rawAvg: number;     // Secondary tie-breaker
}

export const calculateLeaderboard = (
  projects: Project[], 
  scores: Score[], 
  criteria: Criterion[],
  organizerCategories: string[] = [],
  filterCategory: string | null = null
): ProjectScoreStats[] => {
  
  // 1. Identify which criteria IDs to include in the calculation
  const includedCriteriaIds = new Set<string>();
  
  criteria.forEach(c => {
    const isCategoryCriterion = organizerCategories.includes(c.name);
    
    if (!filterCategory) {
      // OVERALL VIEW: Exclude all category-specific criteria
      if (!isCategoryCriterion) {
        includedCriteriaIds.add(c.id);
      }
    } else {
      // CATEGORY VIEW: Include General Criteria AND the specific category criterion
      if (!isCategoryCriterion || c.name === filterCategory) {
        includedCriteriaIds.add(c.id);
      }
    }
  });

  // 2. Filter projects based on view
  let relevantProjects = projects.filter(p => !p.noShow);
  if (filterCategory) {
    relevantProjects = relevantProjects.filter(p => p.categories.includes(filterCategory));
  }

  // 3. Group Scores by Judge to perform Stack Ranking
  const judgeScores: Record<string, { projectId: string, rawScore: number }[]> = {};

  scores.forEach(s => {
      // Filter out scores for projects that aren't relevant (e.g. no-shows or not in category)
      if (!relevantProjects.some(p => p.id === s.projectId)) return;

      let rawTotal = 0;
      Object.entries(s.criteria).forEach(([cId, scoreVal]) => {
        if (includedCriteriaIds.has(cId)) {
          const criterion = criteria.find(c => c.id === cId);
          const weight = criterion?.weight ?? 1;
          rawTotal += scoreVal * weight;
        }
      });

      if (!judgeScores[s.judgeId]) judgeScores[s.judgeId] = [];
      judgeScores[s.judgeId].push({ projectId: s.projectId, rawScore: rawTotal });
  });

  // 4. Calculate Ranking Points per Judge
  const projectPoints: Record<string, number> = {};
  const projectRawTotals: Record<string, number> = {};
  const projectJudgeCounts: Record<string, number> = {};

  // Initialize
  relevantProjects.forEach(p => {
      projectPoints[p.id] = 0;
      projectRawTotals[p.id] = 0;
      projectJudgeCounts[p.id] = 0;
  });

  Object.values(judgeScores).forEach(jScores => {
      // Sort descending by raw score
      jScores.sort((a, b) => b.rawScore - a.rawScore);

      // Assign points based on rank
      // Standard Competition Ranking (1224): 
      // 1st (5pts), 2nd (4pts), 3rd (3pts), 4th (2pts), 5th (1pt)
      // Ties get the points for their rank index.
      
      for (let i = 0; i < jScores.length; i++) {
          const item = jScores[i];
          
          // Track raw stats for secondary data
          projectRawTotals[item.projectId] += item.rawScore;
          projectJudgeCounts[item.projectId] += 1;

          // Determine Rank
          // Rank is (Index of first item with this score) + 1
          const firstIndex = jScores.findIndex(s => s.rawScore === item.rawScore);
          const rank = firstIndex + 1;

          let points = 0;
          if (rank === 1) points = 5;
          else if (rank === 2) points = 4;
          else if (rank === 3) points = 3;
          else if (rank === 4) points = 2;
          else if (rank === 5) points = 1;

          if (points > 0) {
              projectPoints[item.projectId] += points;
          }
      }
  });

  // 5. Construct Result
  return relevantProjects.map(p => {
    const timesJudged = projectJudgeCounts[p.id] || 0;
    const rawTotal = projectRawTotals[p.id] || 0;
    
    return {
      projectId: p.id,
      projectName: p.name,
      table: p.table,
      timesJudged: timesJudged,
      rankPoints: projectPoints[p.id] || 0,
      rawAvg: timesJudged > 0 ? rawTotal / timesJudged : 0
    };
  }).sort((a, b) => {
      // Primary Sort: Rank Points
      if (b.rankPoints !== a.rankPoints) return b.rankPoints - a.rankPoints;
      // Secondary Sort: Raw Average (Tie Breaker)
      return b.rawAvg - a.rawAvg;
  });
};