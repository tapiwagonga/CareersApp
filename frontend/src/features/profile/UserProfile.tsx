import React, { useState, useEffect } from "react";
import Avatar from "react-nice-avatar";
import { UserProfile, AnalysisResult } from "../../types";
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
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ResumeMeta = {
  createdAt?: string;
  phaseIndex: number;
  taskKey?: string | null;
  roleTitle?: string;
};

interface Props {
  user: UserProfile;
  stats: { skillsFound: number; completedModules: number; hoursLearned: number };
  onClose: () => void;
  onLogout: () => void;
  onEditAvatar: () => void;
  onUpdateProfile: (name: string, role: string, email: string) => void;
  onLoadRoadmap: (data: AnalysisResult, meta?: ResumeMeta) => void;
}

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

  const [savedRoadmaps, setSavedRoadmaps] = useState<any[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);

  useEffect(() => {
    setName(user.name || "");
    setRole(user.target_role || "Career Explorer");
    setEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    const fetchRoadmaps = async () => {
      if (!user?.id) return;

      setLoadingRoadmaps(true);
      try {
        const { data, error } = await supabase
          .from("saved_roadmaps")
          .select(
            "id, role_title, roadmap_data, created_at, last_accessed_at, progress_pct, current_xp, last_opened_phase_index, last_opened_task_key"
          )
          .eq("user_id", user.id)
          .order("last_accessed_at", { ascending: false });

        if (!error && data) setSavedRoadmaps(data);
      } catch (err) {
        console.error("fetchRoadmaps failed", err);
      } finally {
        setLoadingRoadmaps(false);
      }
    };

    void fetchRoadmaps();
  }, [user?.id]);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleSave = () => {
    const roleToSave = role.trim() || "Career Explorer";
    const nameToSave = name.trim() || email.split("@")[0];

    onUpdateProfile(nameToSave, roleToSave, email);

    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2000);
  };

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
                onClick={onEditAvatar}
                className="absolute bottom-1 right-1 bg-black text-white p-2.5 rounded-full border-[3px] border-white shadow-md hover:scale-110 transition-transform cursor-pointer z-10"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-tight truncate">
              {name && !name.includes("@") ? name : "Guest"}
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              {role || "Career Explorer"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              icon={<Zap size={16} className="text-orange-500" />}
              val={`Lvl ${Math.floor((user.xp || 0) / 1000) + 1}`}
              label="Rank"
            />
            <MiniStat
              icon={<Map size={16} className="text-blue-500" />}
              val={stats.skillsFound}
              label="Skills"
            />
            <MiniStat
              icon={<Trophy size={16} className="text-yellow-500" />}
              val="0"
              label="Badges"
            />
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all shadow-sm">
              <button
                onClick={() => toggleSection("roadmaps")}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
                    <Map size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900">Active Journeys</span>
                    <span className="block text-xs text-gray-400">
                      {savedRoadmaps.length} saved paths
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-300 transition-transform ${activeSection === "roadmaps" ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {(activeSection === "roadmaps" || activeSection === null) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 space-y-3">
                      {loadingRoadmaps ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="animate-spin text-gray-400" />
                        </div>
                      ) : savedRoadmaps.length > 0 ? (
                        savedRoadmaps.map(mapRow => (
                          <button
                            key={mapRow.id}
                            onClick={() => {
                              const meta: ResumeMeta = {
                                createdAt: mapRow.created_at,
                                phaseIndex: Number(mapRow.last_opened_phase_index || 1),
                                taskKey: mapRow.last_opened_task_key || null,
                                roleTitle: mapRow.role_title
                              };

                              onLoadRoadmap(mapRow.roadmap_data, meta);
                              onClose();
                            }}
                            className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-black hover:shadow-md transition-all group bg-gray-50/50"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-gray-900 truncate pr-2">
                                {mapRow.role_title}
                              </span>
                              <div className="flex items-center gap-1 text-black opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-bold uppercase">Resume</span>
                                <ArrowRight size={14} />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(mapRow.created_at).toLocaleDateString("en-GB")}
                              </span>
                              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                {mapRow.progress_pct || 0}% Done
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${mapRow.progress_pct || 0}%` }}
                              />
                            </div>

                            <div className="mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                              Resume phase {Number(mapRow.last_opened_phase_index || 1)}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-xl">
                          <Map size={24} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-400 text-xs font-medium">No saved paths yet.</p>
                          <p className="text-gray-300 text-[10px]">Start an analysis to begin.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all shadow-sm">
              <button
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