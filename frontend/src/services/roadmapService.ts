import { supabase } from "../lib/supabase";
import { AnalysisResult } from "../types";

export type SaveOptions = {
  roadmapId?: string;
  status?: "active" | "archived";
  lastOpenedPhaseIndex?: number;
  lastOpenedTaskKey?: string | null;
  phaseIndex?: number;
  taskKey?: string | null;
};

export type SaveResult = { ok: boolean; id?: string };

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

const isTaskDone = (t: any) =>
  t?.status === "Completed" || t?.status === "Done" || Boolean(t?.is_completed);

const calcProgress = (roadmapData: AnalysisResult) => {
  let totalXP = 0;
  let currentXP = 0;

  safeArray<any>((roadmapData as any)?.roadmap).forEach(phase => {
    safeArray<any>(phase?.tasks).forEach(t => {
      const xp = t?.xp_reward || 50;
      totalXP += xp;
      if (isTaskDone(t)) currentXP += xp;
    });
  });

  const progressPct = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0;
  return { totalXP, currentXP, progressPct };
};

export type RoadmapRow = {
  id: string;
  user_id: string;
  role_title: string;
  roadmap_data: AnalysisResult;
  created_at: string;
  last_accessed_at: string;
  progress_pct: number;
  current_xp: number;
  total_xp: number;
  status: "active" | "archived";
  last_opened_phase_index: number | null;
  last_opened_task_key: string | null;
};

export const roadmapService = {
  async saveRoadmap(
    userId: string,
    roleTitle: string,
    roadmapData: AnalysisResult,
    options?: SaveOptions
  ): Promise<SaveResult> {
    try {
      if (!userId || !roleTitle || !roadmapData) return { ok: false };

      const { totalXP, currentXP, progressPct } = calcProgress(roadmapData);

      const payload: any = {
        user_id: userId,
        role_title: roleTitle,
        roadmap_data: roadmapData,
        current_xp: currentXP,
        total_xp: totalXP,
        progress_pct: progressPct,
        status: options?.status ?? "active",
        last_accessed_at: new Date().toISOString()
      };

      const phaseIndex =
        typeof options?.lastOpenedPhaseIndex === "number"
          ? options.lastOpenedPhaseIndex
          : typeof options?.phaseIndex === "number"
            ? options.phaseIndex
            : undefined;

      const taskKey =
        options?.lastOpenedTaskKey !== undefined
          ? options.lastOpenedTaskKey
          : options?.taskKey !== undefined
            ? options.taskKey
            : undefined;

      if (typeof phaseIndex === "number") payload.last_opened_phase_index = phaseIndex;
      if (taskKey !== undefined) payload.last_opened_task_key = taskKey;

      let targetId = options?.roadmapId;

      if (!targetId) {
        const { data: existing } = await supabase
          .from("saved_roadmaps")
          .select("id")
          .eq("user_id", userId)
          .eq("role_title", roleTitle)
          .maybeSingle();

        if (existing?.id) {
          targetId = existing.id;
        }
      }

      let resultData;
      let resultError;

      if (targetId) {
        const { data, error } = await supabase
          .from("saved_roadmaps")
          .update(payload)
          .eq("id", targetId)
          .select("id")
          .maybeSingle();
        resultData = data;
        resultError = error;
      } else {
        const { data, error } = await supabase
          .from("saved_roadmaps")
          .insert(payload)
          .select("id")
          .maybeSingle();
        resultData = data;
        resultError = error;
      }

      if (resultError) {
        console.error("saveRoadmap error", resultError.message);
        return { ok: false };
      }

      return { ok: true, id: resultData?.id };
    } catch (e) {
      console.error("saveRoadmap crash", e);
      return { ok: false };
    }
  },

  async updateResumePointer(params: {
    userId: string;
    roleTitle: string;
    lastOpenedPhaseIndex: number;
    lastOpenedTaskKey?: string | null;
  }): Promise<{ ok: boolean }> {
    try {
      if (!params.userId || !params.roleTitle) return { ok: false };

      const updates: any = {
        last_opened_phase_index: params.lastOpenedPhaseIndex,
        last_accessed_at: new Date().toISOString()
      };

      if (params.lastOpenedTaskKey !== undefined) {
        updates.last_opened_task_key = params.lastOpenedTaskKey;
      }

      const { error } = await supabase
        .from("saved_roadmaps")
        .update(updates)
        .eq("user_id", params.userId)
        .eq("role_title", params.roleTitle);

      if (error) {
        console.error("updateResumePointer error", error.message);
        return { ok: false };
      }

      return { ok: true };
    } catch (e) {
      console.error("updateResumePointer crash", e);
      return { ok: false };
    }
  },

  async updateResume(
    userId: string,
    roleTitle: string,
    phaseIndex: number,
    taskKey?: string | null
  ): Promise<{ ok: boolean }> {
    return this.updateResumePointer({
      userId,
      roleTitle,
      lastOpenedPhaseIndex: phaseIndex,
      lastOpenedTaskKey: taskKey
    });
  },

  async getLatestRoadmap(userId: string): Promise<RoadmapRow | null> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, user_id, role_title, roadmap_data, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, last_opened_phase_index, last_opened_task_key"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("last_accessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getLatestRoadmap error", error.message);
      return null;
    }

    return (data as RoadmapRow) || null;
  },

  async getRoadmaps(userId: string): Promise<RoadmapRow[]> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, user_id, role_title, roadmap_data, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, last_opened_phase_index, last_opened_task_key"
      )
      .eq("user_id", userId)
      .order("last_accessed_at", { ascending: false });

    if (error) {
      console.error("getRoadmaps error", error.message);
      return [];
    }

    return (data as RoadmapRow[]) || [];
  },

  async getRoadmapById(userId: string, roadmapId: string): Promise<RoadmapRow | null> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, user_id, role_title, roadmap_data, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, last_opened_phase_index, last_opened_task_key"
      )
      .eq("user_id", userId)
      .eq("id", roadmapId)
      .maybeSingle();

    if (error) {
      console.error("getRoadmapById error", error.message);
      return null;
    }

    return (data as RoadmapRow) || null;
  }
};