import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Clock, 
  Target, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  BookOpen,
  MonitorPlay,
  Terminal,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { Preferences } from "../../types";

interface Props {
  roleName: string;
  gapCounts: { critical: number; total: number };
  onSubmit: (prefs: Preferences) => void;
  onCancel: () => void;
}

export const StrategyConfig = ({ roleName, gapCounts, onSubmit, onCancel }: Props) => {
  const [prefs, setPrefs] = useState<Preferences>({
    experienceLevel: "Mid", // Hidden default, could be added to UI if needed
    learningStyle: "Visual",
    hoursPerWeek: 15,
    timeline: "Standard"
  });

  const [pace, setPace] = useState<{ label: string; color: string; icon: React.ReactNode }>({ 
    label: "", color: "", icon: null 
  });

  // Real-time Feasibility Engine
  useEffect(() => {
    const hours = prefs.hoursPerWeek;
    const isUrgent = prefs.timeline === "Urgent";

    if (isUrgent && hours < 20) {
        setPace({ 
            label: "High Risk", 
            color: "bg-red-50 text-red-700 border-red-100",
            icon: <AlertTriangle size={18} />
        });
    } else if (isUrgent && hours >= 20) {
        setPace({ 
            label: "Bootcamp Intensity", 
            color: "bg-orange-50 text-orange-700 border-orange-100",
            icon: <ZapIcon /> 
        });
    } else if (hours > 30) {
        setPace({ 
            label: "Aggressive", 
            color: "bg-blue-50 text-blue-700 border-blue-100",
            icon: <TrendingUp size={18} />
        });
    } else {
        setPace({ 
            label: "Sustainable", 
            color: "bg-green-50 text-green-700 border-green-100",
            icon: <CheckCircle2 size={18} />
        });
    }
  }, [prefs.hoursPerWeek, prefs.timeline]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8 bg-[#F8F9FB] font-sans text-gray-900 pb-32">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-white overflow-hidden grid lg:grid-cols-12"
      >
        
        {/* --- LEFT PANEL: CONTEXT --- */}
        <div className="lg:col-span-4 bg-gray-50/80 p-8 flex flex-col justify-between border-r border-gray-100 relative">
           {/* Decor */}
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

           <div>
               <button 
                  onClick={onCancel}
                  className="flex items-center gap-2 text-gray-400 hover:text-black font-bold text-xs uppercase tracking-wider transition-colors mb-8"
               >
                  <ArrowLeft size={14} /> Back
               </button>

               <div className="mb-8">
                   <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                     Strategy <br /> Configuration
                   </h2>
                   <p className="text-gray-500 text-sm leading-relaxed">
                     Define the parameters for your custom curriculum. We optimise for efficiency based on these inputs.
                   </p>
               </div>

               {/* Summary Ticket */}
               <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                  <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mission Objective</p>
                      <p className="font-bold text-gray-900 leading-tight text-lg">{roleName}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Scope</p>
                          <p className="text-2xl font-serif font-bold">{gapCounts.total} <span className="text-sm font-sans font-normal text-gray-400">Skills</span></p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Critical Gaps</p>
                          <p className="text-2xl font-serif font-bold text-indigo-600">{gapCounts.critical}</p>
                      </div>
                  </div>
               </div>
           </div>

           {/* Dynamic Feedback Widget */}
           <motion.div 
              layout
              className={`mt-6 p-4 rounded-xl border flex flex-col gap-2 transition-colors duration-500 ${pace.color}`}
           >
               <div className="flex items-center gap-2 font-bold text-sm">
                   {pace.icon}
                   <span>Pace: {pace.label}</span>
               </div>
               <p className="text-xs opacity-90 leading-relaxed">
                   {prefs.timeline === "Urgent" 
                    ? "Focusing strictly on interview-critical topics." 
                    : "Balancing theory, practice, and portfolio building."}
               </p>
           </motion.div>
        </div>

        {/* --- RIGHT PANEL: INPUTS --- */}
        <div className="lg:col-span-8 p-8 lg:p-12 space-y-10 bg-white">
            
            {/* 1. TIMELINE / GOAL */}
            <section className="space-y-4">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Target size={20} className="text-gray-400"/> What is your primary goal?
               </h3>
               
               <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { id: "Urgent", label: "Interview Prep", sub: "ASAP", desc: "High-impact topics only." },
                    { id: "Standard", label: "Upskill", sub: "Standard", desc: "Builds strong fundamentals." },
                    { id: "LongTerm", label: "Career Pivot", sub: "Deep Dive", desc: "Complete mastery & projects." }
                  ].map((opt) => {
                     const isSelected = prefs.timeline === opt.id;
                     return (
                        <button
                           key={opt.id}
                           onClick={() => setPrefs({ ...prefs, timeline: opt.id as any })}
                           className={`
                              relative p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between h-32 group
                              ${isSelected 
                                 ? "bg-black border-black text-white shadow-xl scale-[1.02]" 
                                 : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
                           `}
                        >
                           <div className="flex justify-between items-start">
                               <span className="font-bold text-sm">{opt.label}</span>
                               {isSelected && <CheckCircle2 size={16} className="text-green-400" />}
                           </div>
                           
                           <div>
                               <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? "text-gray-400" : "text-indigo-600"}`}>
                                   {opt.sub}
                               </div>
                               <p className={`text-xs leading-tight ${isSelected ? "text-gray-400" : "text-gray-500"}`}>
                                   {opt.desc}
                               </p>
                           </div>
                        </button>
                     )
                  })}
               </div>
            </section>

            <div className="h-px w-full bg-gray-100" />

            {/* 2. CUSTOM SLIDER */}
            <section className="space-y-6">
               <div className="flex justify-between items-end">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                     <Clock size={20} className="text-gray-400"/> Weekly Availability
                  </h3>
                  <div className="font-bold text-3xl font-serif">
                     {prefs.hoursPerWeek} <span className="text-sm font-sans text-gray-400 font-medium">hrs/week</span>
                  </div>
               </div>
               
               <div className="relative h-12 flex items-center select-none group">
                  {/* Track */}
                  <div className="absolute inset-0 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-black"
                        animate={{ width: `${(prefs.hoursPerWeek / 60) * 100}%` }}
                      />
                  </div>
                  
                  {/* Invisible Input for Accessibility */}
                  <input 
                     type="range" min="5" max="60" step="5"
                     value={prefs.hoursPerWeek}
                     onChange={(e) => setPrefs({ ...prefs, hoursPerWeek: parseInt(e.target.value) })}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />

                  {/* Custom Thumb */}
                  <motion.div 
                     className="absolute w-8 h-8 bg-white border-2 border-black rounded-full shadow-lg z-10 pointer-events-none flex items-center justify-center top-1/2 -translate-y-1/2"
                     animate={{ left: `calc(${(prefs.hoursPerWeek / 60) * 100}% - 16px)` }}
                  >
                      <div className="w-2 h-2 bg-black rounded-full" />
                  </motion.div>
               </div>

               <div className="flex justify-between text-xs font-bold text-gray-300 uppercase tracking-widest px-1">
                  <span>Casual (5h)</span>
                  <span>Part-Time (20h)</span>
                  <span>Immersive (60h)</span>
               </div>
            </section>

            <div className="h-px w-full bg-gray-100" />

            {/* 3. LEARNING STYLE (Restored & Polished) */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Info size={20} className="text-gray-400"/> Preferred Format
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: "Visual", label: "Video", icon: <MonitorPlay size={20}/> },
                        { id: "Reading", label: "Reading", icon: <BookOpen size={20}/> },
                        { id: "Kinesthetic", label: "Projects", icon: <Terminal size={20}/> },
                    ].map((style) => {
                        const isSelected = prefs.learningStyle === style.id;
                        return (
                            <button
                                key={style.id}
                                onClick={() => setPrefs({...prefs, learningStyle: style.id as any})}
                                className={`
                                    flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all
                                    ${isSelected ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}
                                `}
                            >
                                {style.icon}
                                <span className="text-xs font-bold uppercase tracking-wider">{style.label}</span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* ACTION FOOTER */}
            <div className="pt-4 flex justify-end">
               <button 
                  onClick={() => onSubmit(prefs)}
                  className="bg-black hover:bg-gray-800 text-white px-10 py-5 rounded-2xl font-bold text-base flex items-center gap-4 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 group"
               >
                  Generate Roadmap
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>

        </div>
      </motion.div>
    </div>
  );
};

// Simple Zap Icon component for the "Bootcamp" state
const ZapIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);