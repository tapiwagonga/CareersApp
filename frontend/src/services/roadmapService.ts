import { supabase } from "../lib/supabase";
import { AnalysisResult } from "../types";

export interface RoadmapMeta {
  id: string;
  created_at: string;
  last_accessed_at: string | null;
  progress_pct: number;
  current_xp: number;
  total_xp: number;
  status: string;

  active_phase_index: number;
  active_task_id: string | null;
  active_task_updated_at: string | null;
}

type SaveOptions = {
  roadmapId?: string;
  activePhaseIndex?: number;
  activeTaskId?: string | null;
  status?: "active" | "archived";
};

const computeProgress = (roadmapData: AnalysisResult) => {
  let totalXP = 0;
  let currentXP = 0;

  const phases = roadmapData?.roadmap || [];
  for (const phase of phases) {
    const tasks = phase?.tasks || [];
    for (const t of tasks) {
      const xp = t?.xp_reward || 50;
      totalXP += xp;

      const done =
        t?.status === "Completed" ||
        t?.status === "Done" ||
        (t as any)?.is_completed === true;

      if (done) currentXP += xp;
    }
  }

  const progressPct = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0;
  return { totalXP, currentXP, progressPct };
};

const normaliseRoadmapData = (raw: any): AnalysisResult | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AnalysisResult;
    } catch {
      return null;
    }
  }
  return raw as AnalysisResult;
};

export const roadmapService = {
  /**
   * Save or update a roadmap record.
   * Stable rule
   * If roadmapId is provided we update that exact row.
   * If roadmapId is not provided we upsert on user_id,role_title for a single active roadmap per role.
   */
  async saveRoadmap(
    userId: string,
    roleTitle: string,
    roadmapData: AnalysisResult,
    options: SaveOptions = {}
  ): Promise<{ ok: boolean; id?: string }> {
    if (!userId || !roleTitle || !roadmapData?.roadmap) return { ok: false };

    const { totalXP, currentXP, progressPct } = computeProgress(roadmapData);

    const payload: any = {
      user_id: userId,
      role_title: roleTitle,
      roadmap_data: roadmapData,
      current_xp: currentXP,
      total_xp: totalXP,
      progress_pct: progressPct,
      status: options.status || "active",
      last_accessed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_phase_index: options.activePhaseIndex ?? 1,
      active_task_id: options.activeTaskId ?? null,
      active_task_updated_at: options.activeTaskId ? new Date().toISOString() : null
    };

    try {
      if (options.roadmapId) {
        const { data, error } = await supabase
          .from("saved_roadmaps")
          .update(payload)
          .eq("id", options.roadmapId)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle();

        if (error) {
          console.error("Roadmap update error:", error.message);
          return { ok: false };
        }

        return { ok: true, id: data?.id || options.roadmapId };
      }

      const { data, error } = await supabase
        .from("saved_roadmaps")
        .upsert(payload, { onConflict: "user_id,role_title" })
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Roadmap upsert error:", error.message);
        return { ok: false };
      }

      return { ok: true, id: data?.id };
    } catch (e) {
      console.error("Roadmap save exception:", e);
      return { ok: false };
    }
  },

  /**
   * Lightweight pointer update.
   * Call this on phase change and task click, not on every render.
   */
  async updateResumePointer(params: {
    userId: string;
    roadmapId: string;
    activePhaseIndex: number;
    activeTaskId?: string | null;
  }): Promise<boolean> {
    const { userId, roadmapId, activePhaseIndex, activeTaskId } = params;
    if (!userId || !roadmapId) return false;

    const { error } = await supabase
      .from("saved_roadmaps")
      .update({
        active_phase_index: activePhaseIndex,
        active_task_id: activeTaskId ?? null,
        active_task_updated_at: activeTaskId ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", roadmapId)
      .eq("user_id", userId);

    if (error) {
      console.error("Resume pointer update error:", error.message);
      return false;
    }
    return true;
  },

  /**
   * Fetch latest active roadmap.
   */
  async getLatestRoadmap(
    userId: string
  ): Promise<{ data: AnalysisResult; meta: RoadmapMeta } | null> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, roadmap_data, active_phase_index, active_task_id, active_task_updated_at"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("last_accessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Fetch error:", error.message);
      return null;
    }
    if (!data) return null;

    const rd = normaliseRoadmapData(data.roadmap_data);
    if (!rd) return null;

    return {
      data: rd,
      meta: {
        id: data.id,
        created_at: data.created_at,
        last_accessed_at: data.last_accessed_at,
        progress_pct: data.progress_pct ?? 0,
        current_xp: data.current_xp ?? 0,
        total_xp: data.total_xp ?? 0,
        status: data.status,
        active_phase_index: data.active_phase_index ?? 1,
        active_task_id: data.active_task_id ?? null,
        active_task_updated_at: data.active_task_updated_at ?? null
      }
    };
  },

  /**
   * Fetch all roadmaps for profile.
   */
  async getRoadmaps(userId: string): Promise<RoadmapMeta[] & any> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, role_title, active_phase_index, active_task_id, active_task_updated_at"
      )
      .eq("user_id", userId)
      .order("last_accessed_at", { ascending: false });

    if (error) {
      console.error("Fetch roadmaps error:", error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Load a roadmap by id, used by profile click.
   */
  async getRoadmapById(
    userId: string,
    roadmapId: string
  ): Promise<{ data: AnalysisResult; meta: RoadmapMeta } | null> {
    const { data, error } = await supabase
      .from("saved_roadmaps")
      .select(
        "id, created_at, last_accessed_at, progress_pct, current_xp, total_xp, status, roadmap_data, active_phase_index, active_task_id, active_task_updated_at"
      )
      .eq("user_id", userId)
      .eq("id", roadmapId)
      .maybeSingle();

    if (error) {
      console.error("Fetch roadmap by id error:", error.message);
      return null;
    }
    if (!data) return null;

    const rd = normaliseRoadmapData(data.roadmap_data);
    if (!rd) return null;

    await supabase
      .from("saved_roadmaps")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", roadmapId)
      .eq("user_id", userId);

    return {
      data: rd,
      meta: {
        id: data.id,
        created_at: data.created_at,
        last_accessed_at: data.last_accessed_at,
        progress_pct: data.progress_pct ?? 0,
        current_xp: data.current_xp ?? 0,
        total_xp: data.total_xp ?? 0,
        status: data.status,
        active_phase_index: data.active_phase_index ?? 1,
        active_task_id: data.active_task_id ?? null,
        active_task_updated_at: data.active_task_updated_at ?? null
      }
    };
  }
};
