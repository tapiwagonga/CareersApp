import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { genConfig } from "react-nice-avatar"; 
import { supabase } from "../lib/supabase"; 
import { 
  AppStep, 
  TargetJob, 
  SkillData, 
  Preferences, 
  AnalysisResult,
  UserProfile 
} from "../types";

// Import the timeline engine to calculate dates
import { recalculateTimeline } from "../utils/timeline"; 

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_PREFS: Preferences = {
    experienceLevel: "Mid",
    learningStyle: "Visual",
    hoursPerWeek: 10,
    timeline: "Standard"
};

export const useCareerFlow = () => {
  // --- STATE ---
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LANDING);
  const [loadingText, setLoadingText] = useState("");
  
  // --- DATA ---
  const [targetJob, setTargetJob] = useState<TargetJob | null>(null);
  const [dynamicSkills, setDynamicSkills] = useState<SkillData[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, number>>({});
  const [scannedLevels, setScannedLevels] = useState<Record<string, number>>({});
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); 
  const [pendingPrefs, setPendingPrefs] = useState<Preferences | null>(null);

  // --- 1. AUTO-RESTORE SESSION ---
  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle(); 
            
            if (profile) {
                 setUserProfile(profile);
                 
                 // Check Supabase for active roadmap
                 const { data: roadmaps } = await supabase
                    .from('saved_roadmaps')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .order('last_accessed_at', { ascending: false })
                    .limit(1);

                 if (roadmaps && roadmaps.length > 0) {
                     // CHECK FLAG: Did the user explicitly exit recently?
                     // If they clicked "Back to Home", we don't force them back to Dashboard
                     const manualExit = sessionStorage.getItem("manualExit");
                     
                     if (manualExit) {
                         console.log("🚫 Auto-restore suppressed by manual exit.");
                         return; // Stay on Landing
                     }

                     console.log("🔄 Restoring session...", roadmaps[0]);
                     setAnalysis(roadmaps[0].roadmap_data);
                     setTargetJob({ 
                        role: roadmaps[0].role_title, 
                        company: "Resumed Session", 
                        description: "Resumed from database", 
                        cvFile: null 
                    });
                     setCurrentStep((prev) => prev === AppStep.LANDING ? AppStep.DASHBOARD : prev);
                 }
            } else {
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    name: user.email?.split('@')[0] || "User",
                    role: "Career Explorer"
                });
            }
        }
    } catch (err) {
        console.error("Session check failed:", err);
    }
  };

  // --- NAVIGATION HELPERS ---
  const isStepAccessible = (step: AppStep): boolean => {
    switch (step) {
      case AppStep.LANDING: return true;
      case AppStep.AUTH: return true; 
      case AppStep.INTERVIEW: return true; 
      case AppStep.ASSESSMENT: return dynamicSkills.length > 0;
      case AppStep.DASHBOARD: return analysis !== null;
      case AppStep.PROFILE: return userProfile !== null;
      case AppStep.PROFILE_SETUP: return !!userProfile; 
      default: return false;
    }
  };

  const getGapCounts = () => {
    const critical = dynamicSkills.filter(s => s.importance === "Critical").length;
    const total = dynamicSkills.length;
    return { critical, total };
  };

  const goToStep = (step: AppStep) => {
    if (currentStep === AppStep.LOADING) return;
    if (isStepAccessible(step)) setCurrentStep(step);
  };

  const goBack = () => {
    switch (currentStep) {
      case AppStep.ASSESSMENT: setCurrentStep(AppStep.LANDING); break;
      case AppStep.AUTH: setCurrentStep(AppStep.ASSESSMENT); break; 
      case AppStep.DASHBOARD: setCurrentStep(AppStep.ASSESSMENT); break; 
      case AppStep.PROFILE: setCurrentStep(AppStep.DASHBOARD); break; 
      default: break;
    }
  };

  // --- API ---
  const apiCallWithRetry = async (url: string, data: any, retries = 3, backoff = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.post(url, data);
        } catch (err: any) {
            if (axios.isCancel(err) || err.name === 'AbortError') return null;
            const isConnRefused = err.code === "ECONNREFUSED" || err.message.includes("Network Error");
            if (isConnRefused) {
                alert("Cannot connect to server. Is the Python Backend running on port 8000?");
                throw err;
            }
            const isRateLimit = err.response && err.response.status === 429;
            if (isRateLimit && i < retries - 1) {
                setLoadingText(`High Traffic... Retrying (${i + 1}/${retries})`);
                await sleep(backoff);
                backoff *= 1.5; 
            } else {
                throw err;
            }
        }
    }
  };

  // --- ACTIONS ---

  const handleJobSubmit = async (data: TargetJob) => {
    // START NEW SEARCH -> Clear Exit Flag so normal flow works
    sessionStorage.removeItem("manualExit");
    
    setTargetJob(data);
    setDynamicSkills([]);
    setUserSkills({});
    setAnalysis(null);
    setCurrentStep(AppStep.LOADING);
    setLoadingText("Analyzing Job Description..."); 

    try {
      const extractReq = apiCallWithRetry('/api/v1/extract-skills', { description: data.description });
      const cvReq = data.cvFile 
        ? (() => {
            const formData = new FormData();
            formData.append("file", data.cvFile);
            return axios.post('/api/v1/scan-cv', formData, { headers: { "Content-Type": "multipart/form-data" } }).catch(() => null);
          })()
        : Promise.resolve(null);

      const [skillRes, cvRes] = await Promise.all([extractReq, cvReq]);
      
      let safeSkills: SkillData[] = [];
      if (skillRes?.data) {
          safeSkills = Array.isArray(skillRes.data.skills) ? skillRes.data.skills : skillRes.data;
      }

      if (safeSkills.length === 0) throw new Error("API returned 0 skills.");
      setDynamicSkills(safeSkills);
      setScannedLevels(cvRes?.data || {});
      
      setLoadingText(""); 
      setCurrentStep(AppStep.ASSESSMENT);
    } catch (err: any) {
      console.error("❌ Analysis Error:", err);
      setLoadingText(""); 
      setCurrentStep(AppStep.LANDING);
      alert("Analysis failed. Please try again or paste a clearer Job Description.");
    }
  };

  const handleAssessmentSubmit = async (confirmedSkills: Record<string, number>) => {
    setUserSkills(confirmedSkills);
    if (!targetJob) return;

    if (!userProfile) {
        setPendingPrefs(DEFAULT_PREFS);
        setCurrentStep(AppStep.AUTH);
    } else {
        await generateRoadmap(DEFAULT_PREFS, confirmedSkills);
    }
  };

  const generateRoadmap = async (prefs: Preferences, skillsOverride?: Record<string, number>) => {
    if (!targetJob) return;
    setCurrentStep(AppStep.LOADING);
    setLoadingText("Generating Roadmap...");
  
    try {
      const payload = {
        role_name: targetJob.role,
        user_skills: skillsOverride || userSkills,
        preferences: prefs
      };
      
      const res = await apiCallWithRetry('/api/v1/analyze', payload);
      
      if (res?.data) {
          let newAnalysis = res.data;

          // --- ACCOUNTABILITY: CALCULATE DATES ---
          const pace = prefs.hoursPerWeek || 10;
          if (newAnalysis.roadmap) {
             newAnalysis.roadmap = recalculateTimeline(
                 newAnalysis.roadmap, 
                 new Date().toISOString(), 
                 pace
             );
          }

          setAnalysis(newAnalysis);
          setPendingPrefs(null);

          if (userProfile?.id && userProfile.id !== "demo-user-id") {
             console.log("💾 Saving to Database...");
             await supabase.from('profiles').upsert({
                 id: userProfile.id,
                 email: userProfile.email,
                 name: userProfile.name || "User",
                 role: targetJob.role,       
                 target_role: targetJob.role, 
                 updated_at: new Date().toISOString()
             });

             await supabase.from('saved_roadmaps').upsert({
                    user_id: userProfile.id,
                    role_title: newAnalysis.role_name,
                    match_score: newAnalysis.match_percentage,
                    roadmap_data: newAnalysis,
                    status: 'active',
                    last_accessed_at: new Date().toISOString()
                }, { onConflict: 'user_id,role_title' });
             console.log("✅ Roadmap Saved Successfully!");
          }

          setLoadingText("");
          setCurrentStep(AppStep.DASHBOARD);
      }
    } catch (err: any) {
      console.error(err);
      setLoadingText("");
      alert("Error generating roadmap.");
    }
  };

  const updateRoadmapProgress = useCallback(async (updatedRoadmap: AnalysisResult) => {
      // --- ACCOUNTABILITY: DYNAMIC ADJUSTMENT ---
      // If a phase is completed, re-project future phases from TODAY
      const incompletePhases = updatedRoadmap.roadmap.filter(p => !p.is_completed);
      
      if (incompletePhases.length > 0) {
         const adjustedPhases = recalculateTimeline(
            incompletePhases, 
            new Date().toISOString(), 
            10 // Default pace
         );

         updatedRoadmap.roadmap = updatedRoadmap.roadmap.map(p => {
             const adjustment = adjustedPhases.find(ap => ap.week_number === p.week_number);
             return p.is_completed ? p : (adjustment || p);
         });
      }

      setAnalysis(updatedRoadmap);

      if (!userProfile?.id || userProfile.id === "demo-user-id") return;

      let totalXP = 0;
      let currentXP = 0;
      
      updatedRoadmap.roadmap.forEach((phase: any) => {
          if (phase.tasks) {
              phase.tasks.forEach((task: any) => {
                  const xp = task.xp_reward || 50;
                  totalXP += xp;
                  if (task.status === "Completed") currentXP += xp;
              });
          }
      });

      const progressPct = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0;

      try {
        await supabase.from('saved_roadmaps').update({
                roadmap_data: updatedRoadmap,
                current_xp: currentXP,
                total_xp: totalXP,
                progress_pct: progressPct,
                last_accessed_at: new Date().toISOString()
            })
            .eq('user_id', userProfile.id)
            .eq('role_title', updatedRoadmap.role_name); 
      } catch (err) {
        console.error("Save failed:", err);
      }
  }, [userProfile]);

  const loadSavedRoadmap = (savedData: AnalysisResult) => {
      // Manual Load -> Clear Exit Flag to allow persistence next time
      sessionStorage.removeItem("manualExit");
      
      setAnalysis(savedData);
      setTargetJob({ 
          role: savedData.role_name, 
          company: "Saved Path", 
          description: "Loaded from history", 
          cvFile: null 
      });
      setCurrentStep(AppStep.DASHBOARD);
  };

  const handleAuthComplete = (config: any, name: string, role?: string, email?: string) => {
    setUserProfile((prev) => {
        const hasValidConfig = config && typeof config === 'object' && Object.keys(config).length > 0;
        const stableConfig = hasValidConfig ? config : (prev?.avatar_config || genConfig());
        const stableRole = role || prev?.target_role || targetJob?.role || "Career Explorer";
        const stableName = name || prev?.name || email?.split('@')[0] || "Guest User";

        return {
            id: prev?.id || "demo-user-id",
            created_at: prev?.created_at || new Date().toISOString(),
            xp: prev?.xp || 0,
            level: prev?.level || 1,
            name: stableName,
            email: email || prev?.email || "guest@example.com",
            target_role: stableRole, 
            role: stableRole,
            avatar_config: stableConfig
        };
    });
    
    if (pendingPrefs) {
        generateRoadmap(pendingPrefs);
    } else if (currentStep === AppStep.PROFILE_SETUP) {
        setCurrentStep(AppStep.LANDING);
    } else {
        if (analysis) setCurrentStep(AppStep.DASHBOARD);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setPendingPrefs(null);
    setAnalysis(null);
    setTargetJob(null);
    sessionStorage.removeItem("manualExit");
    setCurrentStep(AppStep.LANDING);
  };

  const handleReset = () => {
    if (window.confirm("Start over? All progress will be lost.")) {
        setAnalysis(null);
        setTargetJob(null);
        setScannedLevels({});
        setDynamicSkills([]);
        setUserSkills({});
        setLoadingText("");
        sessionStorage.removeItem("manualExit");
        setCurrentStep(AppStep.LANDING);
    }
  };

  // --- SAFE EXIT ---
  const handleExit = () => {
      // 1. Clear View State
      setAnalysis(null);
      setTargetJob(null);
      setDynamicSkills([]);
      setUserSkills({});
      setCurrentStep(AppStep.LANDING);
      
      // 2. Set Flag to prevent auto-bounceback on refresh/nav
      sessionStorage.setItem("manualExit", "true");
  };

  return {
    state: { currentStep, loadingText, targetJob, dynamicSkills, scannedLevels, analysis, userSkills, userProfile },
    actions: { 
        handleJobSubmit, handleAssessmentSubmit,
        handleReset, handleExit,
        handleAuthComplete, handleLogout, setCurrentStep, 
        goBack, goToStep, loadSavedRoadmap, updateRoadmapProgress 
    },
    helpers: { getGapCounts, isStepAccessible }
  };
};