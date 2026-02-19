import React, { useEffect, useMemo, useState, useCallback } from "react";
import Avatar from "react-nice-avatar";
import type { UserProfile, AnalysisResult } from "../../types";
import { supabase } from "../../lib/supabase";
import {
  Trophy,
  Zap,
  ChevronDown,
  Map,
  X,
  User,
  CheckCircle,
  Edit3,
  Briefcase,
  Mail,
  LogOut,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  user: UserProfile;
  stats: { skillsFound: number; completedModules: number; hoursLearned: number };
  onClose: () => void;
  onLogout: () => void;
  onEditAvatar: () => void;
  onUpdateProfile: (name: string, role: string, email: string) => void;
  onLoadRoadmap: (data: AnalysisResult) => void;
}

type SavedRoadmapRow = {
  id: string;
  user_id: string;
  role_title?: string | null;
  roadmap_data: any;
  created_at: string;
  updated_at?: string | null;
  last_accessed_at?: string | null;
  progress_pct?: number | null;
};

const isDemoUser = (userId?: string) => !userId || userId === "demo-user-id";

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

const formatUK = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const computeProgressPct = (roadmapData: any) => {
  const phases = safeArray<any>(roadmapData?.roadmap);
  if (!phases.length) return 0;

  let total = 0;
  let done = 0;

  phases.forEach((p: any) => {
    const tasks = safeArray<any>(p?.tasks);
    tasks.forEach((t: any) => {
      total += 1;
      const isDone = t?.status === "Completed" || t?.status === "Done" || Boolean(t?.is_completed);
      if (isDone) done += 1;
    });
  });

  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
};

export const UserProfileView = ({
  user,
  stats,
  onClose,
  onLogout,
  onEditAvatar,
  onUpdateProfile,
  onLoadRoadmap
}: Props) => {
  const [activeSection, setActiveSection] = useState<string | null>("roadmaps");

  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState(user.target_role || "Career Explorer");
  const [email, setEmail] = useState(user.email || "");
  const [isSaved, setIsSaved] = useState(false);

  const [savedRoadmaps, setSavedRoadmaps] = useState<SavedRoadmapRow[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);
  const [roadmapsError, setRoadmapsError] = useState<string | null>(null);

  const userId = user?.id;
  console.log(userId);

  useEffect(() => {
    setName(user.name || "");
    setRole(user.role || "Career Explorer");
    setEmail(user.email || "");
  }, [user]);

  const toggleSection = (section: string) => {
    setActiveSection(prev => (prev === section ? null : section));
  };

  const handleSave = () => {
    const cleanEmail = (email || "").trim();
    const roleToSave = (role || "").trim() || "Career Explorer";
    const fallbackName = cleanEmail.includes("@") ? cleanEmail.split("@")[0] : "Guest";
    const nameToSave = (name || "").trim() || fallbackName;

    onUpdateProfile(nameToSave, roleToSave, cleanEmail);

    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2000);
  };

  const fetchRoadmaps = useCallback(async () => {
    if (isDemoUser(userId)) {
      setSavedRoadmaps([]);
      setRoadmapsError(null);
      return;
    }

    setLoadingRoadmaps(true);
    setRoadmapsError(null);

    try {
      const { data, error } = await supabase
        .from("saved_roadmaps")
        .select("id,user_id,role_title,roadmap_data,created_at,updated_at,last_accessed_at,progress_pct")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load saved roadmaps", error);
        setRoadmapsError("Could not load your saved roadmaps.");
        setSavedRoadmaps([]);
        return;
      }

      const rows = (data || []) as SavedRoadmapRow[];

      const enriched = rows.map(r => {
        const derivedProgress = computeProgressPct(r.roadmap_data);
        const useProgress =
          typeof r.progress_pct === "number" && r.progress_pct >= 0 ? Math.round(r.progress_pct) : derivedProgress;
        return { ...r, progress_pct: useProgress };
      });

      setSavedRoadmaps(enriched);
    } catch (e) {
      console.error("Failed to load history", e);
      setRoadmapsError("Could not load your saved roadmaps.");
      setSavedRoadmaps([]);
    } finally {
      setLoadingRoadmaps(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchRoadmaps();
  }, [fetchRoadmaps]);

  const handleResume = useCallback(
    async (row: SavedRoadmapRow) => {
      const payload = row.roadmap_data as AnalysisResult;

      onLoadRoadmap(payload);
      onClose();

      if (isDemoUser(userId)) return;

      try {
        await supabase
          .from("saved_roadmaps")
          .update({
            last_accessed_at: new Date().toISOString(),
            progress_pct: row.progress_pct ?? computeProgressPct(row.roadmap_data)
          })
          .eq("id", row.id)
          .eq("user_id", userId);
      } catch (e) {
        console.error("Failed to update last_accessed_at", e);
      }
    },
    [onClose, onLoadRoadmap, userId]
  );

  const roadmapCountLabel = useMemo(() => {
    if (isDemoUser(userId)) return "Demo mode";
    return `${savedRoadmaps.length} saved paths`;
  }, [savedRoadmaps.length, userId]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-row justify-end items-stretch">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 w-full max-w-md h-full bg-[#FAFAFA] shadow-2xl border-l border-gray-100 overflow-y-auto"
      >
        <div className="p-6 md:p-8 space-y-8 min-h-full pb-20">
          <div className="flex items-center justify-between sticky top-0 bg-[#FAFAFA]/95 backdrop-blur-md py-2 z-20">
            <h2 className="font-serif font-bold text-2xl text-gray-900">My Profile</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-10" />
            <div className="relative inline-block group mx-auto mb-4">
              <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-lg overflow-hidden bg-gray-50">
                {user.avatar_config && <Avatar className="w-full h-full" {...user.avatar_config} />}
              </div>
              <button
                type="button"
                onClick={onEditAvatar}
                className="absolute bottom-1 right-1 bg-black text-white p-2.5 rounded-full border-[3px] border-white shadow-md hover:scale-110 transition-transform cursor-pointer z-10"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-tight truncate">
              {name && !name.includes("@") ? name : "Guest"}
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{role || "Career Explorer"}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              icon={<Zap size={16} className="text-orange-500" />}
              val={`Lvl ${Math.floor(((user.xp || 0) as number) / 1000) + 1}`}
              label="Rank"
            />
            <MiniStat icon={<Map size={16} className="text-blue-500" />} val={stats.skillsFound} label="Skills" />
            <MiniStat icon={<Trophy size={16} className="text-yellow-500" />} val="0" label="Badges" />
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("roadmaps")}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
                    <Map size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900">Saved Roadmaps</span>
                    <span className="block text-xs text-gray-400">{roadmapCountLabel}</span>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-300 transition-transform ${activeSection === "roadmaps" ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {activeSection === "roadmaps" && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 space-y-3">
                      {isDemoUser(userId) ? (
                        <div className="text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                          <Map size={22} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 text-xs font-semibold">Demo mode has no saved roadmaps.</p>
                          <p className="text-gray-400 text-[10px]">Sign in to persist progress.</p>
                        </div>
                      ) : loadingRoadmaps ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="animate-spin text-gray-400" />
                        </div>
                      ) : roadmapsError ? (
                        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-sm flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5" />
                          <div className="flex-1">
                            <div className="font-bold">Could not load roadmaps</div>
                            <div className="text-xs text-rose-600 mt-1">{roadmapsError}</div>
                            <button
                              type="button"
                              onClick={() => void fetchRoadmaps()}
                              className="mt-3 px-3 py-2 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      ) : savedRoadmaps.length > 0 ? (
                        savedRoadmaps.map(row => (
                          <button
                            type="button"
                            key={row.id}
                            onClick={() => void handleResume(row)}
                            className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-black hover:shadow-md transition-all group bg-gray-50/50"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-gray-900 truncate pr-2">
                                {row.role_title || row.roadmap_data?.role_name || "Untitled Roadmap"}
                              </span>
                              <div className="flex items-center gap-1 text-black opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-bold uppercase">Resume</span>
                                <ArrowRight size={14} />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {formatUK(row.updated_at || row.last_accessed_at || row.created_at)}
                              </span>
                              <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                {row.progress_pct || 0}% Done
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${row.progress_pct || 0}%` }}
                              />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-xl">
                          <Map size={24} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-400 text-xs font-medium">No saved roadmaps yet.</p>
                          <p className="text-gray-300 text-[10px]">Complete an analysis to create one.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("info")}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm border border-blue-100">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900">Personal Information</span>
                    <span className="block text-xs text-gray-400">Edit your details</span>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-300 transition-transform ${activeSection === "info" ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {activeSection === "info" && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <User size={12} /> Display Name
                        </label>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-gray-300"
                          placeholder="Your Name"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Briefcase size={12} /> Career Goal
                        </label>
                        <input
                          value={role}
                          onChange={e => setRole(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-gray-300"
                          placeholder="Target Role"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Mail size={12} /> Email
                        </label>
                        <input
                          value={email}
                          readOnly
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSave}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                          isSaved ? "bg-green-500 text-white" : "bg-black text-white hover:bg-gray-800"
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <CheckCircle size={16} /> Saved Successfully
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:bg-red-50 hover:border-red-100 group transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-red-100 group-hover:text-red-500 transition-colors border border-gray-100 group-hover:border-red-200">
                <LogOut size={18} />
              </div>
              <span className="font-bold text-gray-600 group-hover:text-red-600">Sign Out</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const MiniStat = ({ icon, val, label }: any) => (
  <div className="bg-white p-3 rounded-2xl border border-gray-100 text-center shadow-sm">
    <div className="flex justify-center mb-1">{icon}</div>
    <div className="font-bold text-gray-900">{val}</div>
    <div className="text-[10px] text-gray-400 uppercase">{label}</div>
  </div>
);
