import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "react-nice-avatar";
import { Check, User, MessageSquare, Map, LogIn, Wifi, WifiOff } from "lucide-react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./Context/AuthContext";
import { AuthModal } from "./features/auth/AuthModal";
import { AuthScreen } from "./features/auth/AuthScreen";
import { JobInput } from "./features/dashboard/JobInput";
import { SkillAssessment } from "./features/dashboard/SkillAssessment";
import { Dashboard } from "./features/dashboard/Dashboard";
import { AvatarBuilder } from "./features/profile/AvatarBuilder";
import { UserProfileView } from "./features/profile/UserProfile";
import { InterviewSetup } from "./features/interview/InterviewSetup";
import { InterviewSession } from "./features/interview/InterviewSession";
import { useCareerFlow } from "./hooks/useCareerFlow";
import { AppStep } from "./types";

const ROADMAP_STEPS = [
  { id: 1, label: "Start", step: AppStep.LANDING },
  { id: 2, label: "Skills", step: AppStep.ASSESSMENT },
  { id: 3, label: "Path", step: AppStep.DASHBOARD },
];

type ViewMode = "roadmap" | "interview";

function App() {
  const { state, actions, helpers } = useCareerFlow();

  const { user, profile, loading: isAuthLoading, signOut, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [resumeMeta, setResumeMeta] = useState<{ createdAt?: string; phaseIndex: number; taskKey?: string | null; roleTitle?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("roadmap");
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  const [interviewContext, setInterviewContext] = useState<{ role: string; company: string; jd: string } | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
      setIsConnected(!error);
    };
    checkConnection();
  }, []);

  const activeProfile = useMemo(() => {
    const email = user?.email || (profile as any)?.email || state.userProfile?.email || "";
    const fallbackName = email ? email.split("@")[0] : "Guest";


    const fullName =
      state.userProfile?.name ||
      (profile as any)?.full_name ||
      (profile as any)?.name ||
      fallbackName;

    const targetRole =
      state.userProfile?.role ||
      (profile as any)?.role ||
      (profile as any)?.role ||
      "Career Explorer";

    const avatarConfig =
      state.userProfile?.avatar_config ||
      (profile as any)?.avatar_config ||
      null;

    return {
      id: user?.id || (profile as any)?.id || "",
      email,
      name: fullName,
      target_role: targetRole,
      avatar_config: avatarConfig,
      xp: (profile as any)?.current_xp || (profile as any)?.xp || 0,
    };
  }, [user, profile, state.userProfile]);

  useEffect(() => {
    if (!user || !profile) return;

    const dbName =
      (profile as any)?.full_name ||
      (profile as any)?.name ||
      user.email?.split("@")[0] ||
      "Guest";

    const dbRole =
      (profile as any)?.target_role ||
      (profile as any)?.role ||
      "Career Explorer";

    const dbConfig =
      (profile as any)?.avatar_config && Object.keys((profile as any)?.avatar_config).length > 0
        ? (profile as any)?.avatar_config
        : null;

    const local = state.userProfile;
    const isEmpty = !local;
    const isDifferentUser = local && user.email && local.email !== user.email;

    if (isEmpty || isDifferentUser) {
      actions.handleAuthComplete(dbConfig, dbName, dbRole, user.email || "");
    }
  }, [profile, user, actions, state.userProfile]);

  const getCurrentStepIndex = () => {
    if (state.currentStep === AppStep.LOADING) {
      return state.loadingText.includes("Analyzing") ? 2 : 3;
    }
    const match = ROADMAP_STEPS.find(s => s.step === state.currentStep);
    return match ? match.id : 1;
  };

  const handleProfileUpdate = async (newName: string, newRole: string, newEmail: string) => {
    actions.handleAuthComplete(
      state.userProfile?.avatar_config,
      newName,
      newRole,
      newEmail
    );

    if (!user) return;

    try {
      const updates = {
        id: user.id,
        email: user.email,
        full_name: newName,
        target_role: newRole,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates, { onConflict: "id" });
      if (error) throw error;

      await refreshProfile();
    } catch (err: any) {
      console.error("Profile save failed", err?.message || err);
    }
  };

  const handleAvatarSave = async (newConfig: any, newName: string) => {
    const currentRole =
      state.userProfile?.target_role ||
      (profile as any)?.target_role ||
      (profile as any)?.role ||
      "Career Explorer";

    const currentEmail = user?.email || state.userProfile?.email || "";

    actions.handleAuthComplete(newConfig, newName, currentRole, currentEmail);

    if (user) {
      try {
        const { error } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: newName,
            avatar_config: newConfig,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        if (error) throw error;

        await refreshProfile();
      } catch (err: any) {
        console.error("Avatar save failed", err?.message || err);
      }
    }

    setIsEditingAvatar(false);
    setShowProfile(true);
  };

  if (isAuthLoading) return null;

  const showRoadmapNav =
    viewMode === "roadmap" &&
    state.currentStep !== AppStep.PROFILE_SETUP &&
    state.currentStep !== AppStep.AUTH;

  const canOpenProfile = Boolean(user && activeProfile.id);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white overflow-x-hidden flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={actions.handleExit}>
            <div className="relative w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200 transition-all duration-300 group-hover:scale-105 group-hover:bg-black">
              <span className="font-serif font-bold text-2xl italic pt-1 pr-0.5">S</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-serif font-bold text-xl tracking-tight text-gray-900 leading-none">
                SkillGap<span className="text-gray-400 font-sans font-normal text-lg">.ai</span>
              </span>
            </div>
          </div>

          {state.currentStep !== AppStep.AUTH && (
            <div className="hidden md:flex bg-gray-100 p-1 rounded-full relative">
              <button
                onClick={() => setViewMode("roadmap")}
                className={`relative px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 z-10 ${viewMode === "roadmap" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                <Map size={14} /> Roadmap
              </button>
              <button
                onClick={() => setViewMode("interview")}
                className={`relative px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 z-10 ${viewMode === "interview" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                <MessageSquare size={14} /> Coach
              </button>
              <motion.div
                className="absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] bg-black rounded-full shadow-md z-0"
                animate={{ x: viewMode === "roadmap" ? 0 : "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            {isConnected !== null && (
              <div
                title={isConnected ? "Database Connected" : "Database Offline"}
                className={`p-2 rounded-full ${isConnected ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
              >
                {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
            )}

            {user ? (
              <div
                onClick={() => {
                  if (canOpenProfile) setShowProfile(true);
                }}
                className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:ring-2 hover:ring-black hover:ring-offset-2 transition-all cursor-pointer overflow-hidden relative"
              >
                {activeProfile.avatar_config ? <Avatar className="w-full h-full" {...activeProfile.avatar_config} /> : <User size={18} />}
              </div>
            ) : (
              state.currentStep !== AppStep.AUTH && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <LogIn size={14} /> Join Now
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 flex-grow px-4 md:px-0 relative">
        {showRoadmapNav && (
          <div className="max-w-xl mx-auto mb-12 flex justify-center">
            <nav className="flex items-center gap-1 md:gap-2">
              {ROADMAP_STEPS.map((s, idx) => {
                const activeIndex = getCurrentStepIndex();
                const isCurrent = activeIndex === s.id;
                const isCompleted = activeIndex > s.id;
                const canNavigate = helpers.isStepAccessible(s.step);

                return (
                  <div key={s.id} className="flex items-center">
                    <div
                      onClick={() => canNavigate && actions.goToStep(s.step)}
                      className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full transition-all duration-300 ${canNavigate ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-30"}`}
                    >
                      <div
                        className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                          isCurrent ? "border-black bg-black text-white scale-100 shadow-lg" : isCompleted ? "border-black bg-white text-black" : "border-gray-200 text-gray-300"
                        }`}
                      >
                        {isCompleted ? <Check size={10} strokeWidth={3} /> : s.id}
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${isCurrent ? "text-black" : "text-gray-300"}`}>{s.label}</span>
                    </div>
                    {idx < ROADMAP_STEPS.length - 1 && <div className="w-4 h-px bg-gray-100 mx-1" />}
                  </div>
                );
              })}
            </nav>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === "roadmap" && (
            <>
              {state.currentStep === AppStep.AUTH && (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AuthScreen
                    onComplete={(config, name, role, email) => {
                      actions.handleAuthComplete(config, name, role, email);
                    }}
                    onCancel={() => actions.goBack()}
                  />
                </motion.div>
              )}

              {state.currentStep === AppStep.LANDING && (
                <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <JobInput initialData={state.targetJob} onSubmit={actions.handleJobSubmit} isLoading={state.loadingText !== ""} />
                </motion.div>
              )}

              {state.currentStep === AppStep.ASSESSMENT && (
                <motion.div key="assessment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <SkillAssessment roleName={state.targetJob?.role || "Role"} skillsList={state.dynamicSkills} scannedLevels={state.scannedLevels} onSubmit={actions.handleAssessmentSubmit} onCancel={actions.goBack} />
                </motion.div>
              )}

              {state.currentStep === AppStep.LOADING && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[50vh]">
                  <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-gray-100 rounded-full" />
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-serif text-2xl text-gray-900">Processing</h3>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest animate-pulse">{state.loadingText}</p>
                  </div>
                </motion.div>
              )}

              {state.currentStep === AppStep.DASHBOARD && state.analysis && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Dashboard
                    data={state.analysis}
                    onReset={actions.handleReset}
                    onExit={actions.handleExit}
                    onStartInterview={() => setViewMode("interview")}
                    onUpdate={actions.updateRoadmapProgress}
                    userId={user?.id}
                    createdAt={(state.analysis as any)?._meta?.created_at}
                  />
                </motion.div>
              )}
            </>
          )}

          {viewMode === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {state.targetJob || interviewContext ? (
                <InterviewSession
                  user={activeProfile as any}
                  defaultRole={state.targetJob?.role || interviewContext?.role || "Engineer"}
                  defaultCompany={state.targetJob?.company || interviewContext?.company || "Tech Corp"}
                  onClose={() => setViewMode("roadmap")}
                />
              ) : (
                <InterviewSetup onStart={(role, company, jd) => setInterviewContext({ role, company, jd })} onCancel={() => setViewMode("roadmap")} />
              )}
            </motion.div>
          )}

          {state.currentStep === AppStep.PROFILE_SETUP && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AvatarBuilder initialName={state.userProfile?.name} onComplete={actions.handleAuthComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <AnimatePresence>
        {showProfile && user && activeProfile.id && (
          <UserProfileView
            user={activeProfile as any}
            stats={{
              skillsFound: state.dynamicSkills.length,
              completedModules: 0,
              hoursLearned: 0,
            }}
            onClose={() => setShowProfile(false)}
            onLogout={() => {
              signOut();
              setShowProfile(false);
              actions.handleLogout();
            }}
            onEditAvatar={() => {
              setShowProfile(false);
              setIsEditingAvatar(true);
            }}
            onUpdateProfile={handleProfileUpdate}
            onLoadRoadmap={(data) => {
              actions.loadSavedRoadmap(data);
              actions.goToStep(AppStep.DASHBOARD);
              setShowProfile(false);
              setViewMode("roadmap");
            }}
          />
        )}
      </AnimatePresence>

      {isEditingAvatar && (
        <div className="fixed inset-0 z-[60] bg-white">
          <AvatarBuilder initialConfig={activeProfile.avatar_config} initialName={activeProfile.name} onComplete={handleAvatarSave} />
        </div>
      )}
    </div>
  );
}

export default App;