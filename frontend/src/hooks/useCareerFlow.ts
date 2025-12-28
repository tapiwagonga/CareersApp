import { useState } from "react";
import axios from "axios";
import { AppStep, TargetJob, SkillData, Preferences, AnalysisResult } from "../types.ts";

export const useCareerFlow = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LANDING);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [targetJob, setTargetJob] = useState<TargetJob | null>(null);
  const [dynamicSkills, setDynamicSkills] = useState<SkillData[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, number>>({});
  const [scannedLevels, setScannedLevels] = useState<Record<string, number>>({});
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const getGapCounts = () => {
    const critical = dynamicSkills.filter(s => s.importance === "Critical").length;
    const total = dynamicSkills.length;
    return { critical, total };
  };

  const handleJobSubmit = async (data: TargetJob & { cvFile: File | null }) => {
    setTargetJob(data);
    setCurrentStep(AppStep.LOADING);
    setLoadingText("Preparing"); 

    try {
      const skillRes = await axios.post("http://127.0.0.1:8000/api/v1/extract-skills", {
        description: data.description
      });

      let safeSkills: SkillData[] = [];
      const responseData = skillRes.data;

      if (responseData.skills && Array.isArray(responseData.skills)) {
         safeSkills = responseData.skills;
      } else if (Array.isArray(responseData)) {
         safeSkills = responseData;
      } else {
         throw new Error("Invalid Data Format");
      }

      setDynamicSkills(safeSkills);

      if (data.cvFile) {
        setLoadingText("Decoding Professional DNA...");
        const formData = new FormData();
        formData.append("file", data.cvFile);
        const cvRes = await axios.post("http://127.0.0.1:8000/api/v1/scan-cv", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        setScannedLevels(cvRes.data);
      }
      setCurrentStep(AppStep.ASSESSMENT);
    } catch (err) {
      console.error(err);
      alert("API Error. Check console.");
      setCurrentStep(AppStep.LANDING);
    }
  };

  const handleAssessmentSubmit = (confirmedSkills: Record<string, number>) => {
    setUserSkills(confirmedSkills);
    setCurrentStep(AppStep.STRATEGY);
  };

  const handleStrategySubmit = async (prefs: Preferences) => {
    if (!targetJob) return;
  
    setCurrentStep(AppStep.LOADING);
    setLoadingText("Architecting your path...");
  
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/v1/analyze", {
        role_name: targetJob.role,
        user_skills: userSkills,
        preferences: prefs
      });
  
      const data = res.data ?? {};
  
      const dynamicResult: AnalysisResult = {
        role_name: data.role_name ?? `${targetJob.role} at ${targetJob.company}`,
        match_percentage: Number.isFinite(data.match_percentage)
          ? data.match_percentage
          : 0,
  
        missing_skills: Array.isArray(data.missing_skills)
          ? data.missing_skills
          : [],
  
        roadmap: Array.isArray(data.roadmap)
          ? data.roadmap
          : [],
  
        summary: {
          total_hours_required: data.summary?.total_hours_required ?? 0,
          weekly_commitment: data.summary?.weekly_commitment ?? prefs.hoursPerWeek,
          estimated_completion_weeks: data.summary?.estimated_completion_weeks ?? 0
        }
      };
  
      setAnalysis(dynamicResult);
      setCurrentStep(AppStep.DASHBOARD);
    } catch (err) {
      console.error("Analysis failed", err);
      setCurrentStep(AppStep.STRATEGY);
    }
  };
  


  const handleReset = () => {
    setAnalysis(null);
    setTargetJob(null);
    setScannedLevels({});
    setDynamicSkills([]);
    setCurrentStep(AppStep.LANDING);
  };

  return {
    state: { currentStep, loadingText, targetJob, dynamicSkills, scannedLevels, analysis },
    actions: { handleJobSubmit, handleAssessmentSubmit, handleStrategySubmit, handleReset, setCurrentStep },
    helpers: { getGapCounts }
  };
};