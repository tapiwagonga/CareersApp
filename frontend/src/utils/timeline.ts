import { RoadmapPhase } from "../types";

/**
 * Calculates start and end dates for a roadmap based on effort and pace.
 * @param roadmap The list of phases
 * @param startDate When does the user start working? (ISO String)
 * @param hoursPerWeek User's available time (default 10)
 * @returns Updated roadmap with calculated ISO dates
 */
export const recalculateTimeline = (
  roadmap: RoadmapPhase[],
  startDate: string = new Date().toISOString(),
  hoursPerWeek: number = 10
): RoadmapPhase[] => {
  let currentDate = new Date(startDate);

  return roadmap.map((phase, index) => {
    // 1. Is this phase already done? Keep its dates fixed if possible (or just ignore re-calc)
    // For simplicity, we recalculate everything to show "Projected" timeline
    
    const phaseStart = new Date(currentDate);

    // 2. Estimate Duration
    // If API didn't give hours, assume 10h (1 week) roughly
    const workHours = phase.total_hours || 15; 
    
    // Calculate weeks needed (minimum 1 week per phase to be realistic)
    // e.g. 20 hours work / 10 hours/week = 2 weeks duration
    const weeksDuration = Math.max(1, workHours / hoursPerWeek);
    const daysDuration = Math.ceil(weeksDuration * 7);

    // 3. Set End Date
    const phaseEnd = new Date(phaseStart);
    phaseEnd.setDate(phaseEnd.getDate() + daysDuration);

    // 4. Update cursor for next phase (Start of next phase = End of this phase)
    currentDate = new Date(phaseEnd);

    // 5. Format to readable string (e.g. "Feb 10") or ISO for storage
    // We store ISO for precision, UI formats it later
    return {
      ...phase,
      start_date: phaseStart.toISOString(),
      end_date: phaseEnd.toISOString(),
    };
  });
};

/**
 * Helper to check status relative to today
 */
export const getPhaseStatus = (endDateIso: string | undefined, isCompleted: boolean) => {
  if (isCompleted) return { label: "Completed", color: "text-green-500", bg: "bg-green-500/10" };
  
  if (!endDateIso) return { label: "Scheduled", color: "text-gray-400", bg: "bg-gray-100" };

  const today = new Date();
  const due = new Date(endDateIso);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)} days`, color: "text-red-500", bg: "bg-red-500/10", urgent: true };
  if (diffDays <= 2) return { label: `Due in ${diffDays} days`, color: "text-amber-500", bg: "bg-amber-500/10", urgent: true };
  
  return { label: `Due in ${diffDays} days`, color: "text-indigo-400", bg: "bg-indigo-500/10" };
};