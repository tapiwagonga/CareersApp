import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

// --- IMPORTS (Extensions included as requested) ---
import { JobInput } from "./features/dashboard/JobInput.tsx"; 
import { SkillAssessment } from "./features/dashboard/SkillAssessment.tsx";
import { StrategyConfig } from "./features/dashboard/StrategyConfig.tsx"; 
import { Dashboard } from "./features/dashboard/Dashboard.tsx";
import { useCareerFlow } from "./hooks/useCareerFlow.ts"; 
import { AppStep } from "./types.ts";

const STEPS = [
  { id: 1, label: "Start", step: AppStep.LANDING },
  { id: 2, label: "Skills", step: AppStep.ASSESSMENT },
  { id: 3, label: "Plan", step: AppStep.STRATEGY },
  { id: 4, label: "Your Path", step: AppStep.DASHBOARD },
];

function App() {
  const { state, actions, helpers } = useCareerFlow();

  const getCurrentStepIndex = () => {
    if (state.currentStep === AppStep.LOADING) {
      // If we are architecting the plan, we are heading to Step 4. Otherwise, Step 2.
      return state.loadingText.includes("Architecting") ? 4 : 2; 
    }
    const match = STEPS.find(s => s.step === state.currentStep);
    return match ? match.id : 1;
  };



  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={actions.handleReset}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              C
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-gray-900">CareerArchitect</span>
          </div>

          {/* REPLACE YOUR EXISTING <nav> BLOCK WITH THIS */}
<nav className="hidden md:flex items-center gap-12 relative">
  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-100 -z-10" />
  
  {STEPS.map((s) => {
      const activeIndex = getCurrentStepIndex();
      const stepIndex = s.id; // Map 1, 2, 3, 4
      
      const isCurrent = activeIndex === stepIndex;
      const isCompleted = activeIndex > stepIndex;
      
      // LOGIC: Allow click if it's a past step OR if we have the full analysis loaded
      const canNavigate = stepIndex < activeIndex || (state.analysis && stepIndex <= 4);

      return (
      <div 
          key={s.id} 
          onClick={() => canNavigate && actions.setCurrentStep(s.step)}
          className={`relative flex items-center gap-3 pl-2 pr-4 bg-white transition-all duration-300 group
          ${canNavigate ? "cursor-pointer hover:bg-gray-50 rounded-lg" : "cursor-not-allowed opacity-50"}`}
      >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-500 
          ${isCurrent ? "border-black bg-black text-white scale-110 shadow-lg" : ""} 
          ${isCompleted ? "border-black bg-white text-black group-hover:bg-gray-200" : "border-gray-200 text-gray-300"}`}>
          {isCompleted ? <Check size={14} /> : s.id}
          </div>
          <span className={`text-sm font-medium tracking-wide transition-colors duration-300 
          ${isCurrent ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`}>
          {s.label}
          </span>
      </div>
      );
  })}
</nav>
          <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 font-serif text-sm">U</div>
        </div>
      </header>

      <main className="pt-20">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: LANDING */}
          {state.currentStep === AppStep.LANDING && (
            <motion.div key="landing" exit={{ opacity: 0, y: -20 }}>
               <JobInput onSubmit={actions.handleJobSubmit} />
            </motion.div>
          )}

          {/* STEP 2: ASSESSMENT */}
          {state.currentStep === AppStep.ASSESSMENT && state.targetJob && !state.analysis && (
            <motion.div key="assessment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SkillAssessment 
                    roleName={state.targetJob.role}
                    skillsList={state.dynamicSkills}
                    scannedLevels={state.scannedLevels}
                    onSubmit={actions.handleAssessmentSubmit}
                    onCancel={() => actions.setCurrentStep(AppStep.LANDING)}
                />
            </motion.div>
          )}

          {/* STEP 3: STRATEGY */}
          {state.currentStep === AppStep.STRATEGY && state.targetJob && !state.analysis && (
            <motion.div key="strategy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StrategyConfig 
                    roleName={state.targetJob.role}
                    gapCounts={helpers.getGapCounts()}
                    onSubmit={actions.handleStrategySubmit}
                    onCancel={() => actions.setCurrentStep(AppStep.ASSESSMENT)}
                />
            </motion.div>
          )}

          {/* LOADING STATE */}
          {state.currentStep === AppStep.LOADING && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[80vh] bg-white">
                <div className="relative mb-8">
                   <div className="w-20 h-20 border-4 border-gray-50 rounded-full" />
                   <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-3">
                   <h3 className="font-serif text-3xl text-gray-900 tracking-tight">One moment.</h3>
                   <p className="text-gray-500 font-sans text-sm tracking-widest uppercase">{state.loadingText}</p>
                </div>
            </motion.div>
          )}

          {/* STEP 4: DASHBOARD */}
        {/* STEP 4: DASHBOARD & ROADMAP */}
        {state.currentStep === AppStep.DASHBOARD && state.analysis && (
          <motion.div 
            key="dashboard" 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Dashboard 
              data={state.analysis} 
              onReset={actions.handleReset} 
            />
          </motion.div>
        )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;