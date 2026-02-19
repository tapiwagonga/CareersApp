import { useRef, useState } from "react";

interface TaskSession {
  taskId: string;
  startedAt: number;
}

export interface TaskInsight {
  taskId: string;
  timeSpentSeconds: number;
  completed: boolean;
}

export const useLearningAnalytics = () => {
  const activeSession = useRef<TaskSession | null>(null);
  const [insights, setInsights] = useState<Record<string, TaskInsight>>({});

  const startTask = (taskId: string) => {
    activeSession.current = {
      taskId,
      startedAt: Date.now()
    };
  };

  const completeTask = (taskId: string) => {
    if (!activeSession.current || activeSession.current.taskId !== taskId) {
      return;
    }

    const durationSeconds = Math.round(
      (Date.now() - activeSession.current.startedAt) / 1000
    );

    setInsights(prev => ({
      ...prev,
      [taskId]: {
        taskId,
        timeSpentSeconds: durationSeconds,
        completed: true
      }
    }));

    activeSession.current = null;
  };

  const abandonTask = () => {
    activeSession.current = null;
  };

  return {
    startTask,
    completeTask,
    abandonTask,
    insights
  };
};
