import React, { useState, useEffect } from "react";
import Avatar from "react-nice-avatar";
import { UserProfile, AnalysisResult } from "../../types";
import { supabase } from "../../lib/supabase";
import {
  Trophy,
  Zap,
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
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState(user.target_role || "Career Explorer");
  const [email] = useState(user.email || "");

  const [isSaved, setIsSaved] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [savedRoadmaps, setSavedRoadmaps] = useState<any[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);

  useEffect(() => {
    setName(user.name || "");
    setRole(user.target_role || "Career Explorer");
  }, [user]);

  useEffect(() => {
    const fetchRoadmaps = async () => {
      if (!user?.id) return;

      setLoadingRoadmaps(true);
      const { data } = await supabase
        .from("saved_roadmaps")
        .select(
          "id, role_title, roadmap_data, created_at, progress_pct, last_opened_phase_index, last_opened_task_key"
        )
        .eq("user_id", user.id)
        .order("last_accessed_at", { ascending: false });

      if (data) setSavedRoadmaps(data);
      setLoadingRoadmaps(false);
    };

    void fetchRoadmaps();
  }, [user?.id]);

  const handleSave = () => {
    const safeName = name.trim() || email.split("@")[0];
    const safeRole = role.trim() || "Career Explorer";

    onUpdateProfile(safeName, safeRole, email);
    setIsSaved(true);

    window.setTimeout(() => {
      setIsSaved(false);
      setShowEdit(false);
    }, 1200);
  };

  const level = Math.floor((user.xp || 0) / 1000) + 1;
  const xpToNext = 1000 - ((user.xp || 0) % 1000);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto"
      >
        <div className="p-6 space-y-6">

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-6 border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border">
                {user.avatar_config && <Avatar {...user.avatar_config} />}
              </div>

              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900 truncate">
                  {name || "User"}
                </div>
                <div className="text-sm text-gray-500">{role}</div>
              </div>

              <button
                onClick={onEditAvatar}
                className="p-2 rounded-full bg-gray-100"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Level {level}</span>
                <span>{xpToNext} XP to next</span>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black"
                  style={{
                    width: `${((user.xp || 0) % 1000) / 10}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">
                Career Progress
              </div>
              <Trophy size={16} />
            </div>

            <div className="text-sm text-gray-600">
              {savedRoadmaps.length > 0
                ? `You have ${savedRoadmaps.length} active journey${savedRoadmaps.length > 1 ? "s" : ""}`
                : "No active journeys yet"}
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-900 mb-3">
              Active Journey
            </div>

            {loadingRoadmaps ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin" />
              </div>
            ) : savedRoadmaps.length === 0 ? (
              <div className="text-sm text-gray-500 border rounded-xl p-4">
                Start a roadmap to begin your career journey
              </div>
            ) : (
              savedRoadmaps.slice(0, 1).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onLoadRoadmap(r.roadmap_data, {
                      phaseIndex: Number(r.last_opened_phase_index || 1),
                      taskKey: r.last_opened_task_key,
                      roleTitle: r.role_title
                    });
                    onClose();
                  }}
                  className="w-full text-left border rounded-xl p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between">
                    <div className="font-semibold text-sm truncate">
                      {r.role_title}
                    </div>
                    <ArrowRight size={16} />
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {r.progress_pct || 0}% complete
                  </div>

                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${r.progress_pct || 0}%` }}
                    />
                  </div>

                  <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(r.created_at).toLocaleDateString("en-GB")}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowEdit(true)}
              className="w-full border rounded-xl p-4 text-left"
            >
              <div className="font-semibold">Edit Profile</div>
              <div className="text-xs text-gray-500">
                Update name and role
              </div>
            </button>

            <button
              onClick={onLogout}
              className="w-full border rounded-xl p-4 text-left text-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showEdit && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-3">
              <div className="font-bold text-lg">Edit Profile</div>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm"
                placeholder="Name"
              />

              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm"
                placeholder="Role"
              />

              <input
                value={email}
                disabled
                className="w-full border rounded-xl p-3 text-sm bg-gray-50"
              />

              <button
                onClick={handleSave}
                className="w-full bg-black text-white rounded-xl p-3 text-sm font-semibold"
              >
                {isSaved ? "Saved" : "Save Changes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};