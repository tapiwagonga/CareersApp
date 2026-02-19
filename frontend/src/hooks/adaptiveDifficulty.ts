import { RoadmapTask } from "../types";
import { TaskInsight } from "./useLearningAnalytics";

export const scoreTaskDifficulty = (
  task: RoadmapTask,
  insight?: TaskInsight
) => {
  if (!insight) return "unknown";

  const expectedSeconds = task.estimated_minutes * 60;
  const ratio = insight.timeSpentSeconds / expectedSeconds;

  if (ratio < 0.6) return "too_easy";
  if (ratio <= 1.4) return "on_track";
  return "too_hard";
};

export const adjustFutureTasks = (
  tasks: RoadmapTask[],
  insights: Record<string, TaskInsight>
) => {
  return tasks.map(task => {
    const insight = insights[task.id];
    const score = scoreTaskDifficulty(task, insight);

    if (score === "too_easy") {
      return {
        ...task,
        estimated_minutes: Math.max(5, task.estimated_minutes - 5)
      };
    }

    if (score === "too_hard") {
      return {
        ...task,
        estimated_minutes: task.estimated_minutes + 10
      };
    }

    return task;
  });
};
