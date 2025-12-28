import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Clock, 
  Calendar, 
  Target, 
  Zap, 
  Coffee, 
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";

// --- TYPES ---
export interface Preferences {
  experienceLevel: "Junior" | "Mid" | "Senior"; 
  learningStyle: "Visual" | "Text" | "Hands-on";
  hoursPerWeek: number;
  timeline: "Urgent" | "Standard" | "LongTerm"; // The new constraint
}

interface Props {
  roleName: string;
  gapCounts: { critical: number; total: number }; // Context from previous page
  onSubmit: (prefs: Preferences) => void;
  onCancel: () => void;
}

export const StrategyConfig = ({ roleName, gapCounts, onSubmit, onCancel }: Props) => {
  const [prefs, setPrefs] = useState<Preferences>({
    experienceLevel: "Mid",
    learningStyle: "Visual",
    hoursPerWeek: 10,
    timeline: "Standard"
  });

  const [intensity, setIntensity] = useState<"Relaxed" | "Balanced" | "Intense" | "Impossible">("Balanced");

  // Real-time "Feasibility Check"
  useEffect(() => {
    // Simple logic: Less time + Less hours = Bad. Less time + More hours = Intense.
    if (prefs.timeline === "Urgent") {
        if (prefs.hoursPerWeek < 10) setIntensity("Impossible");
        else if (prefs.hoursPerWeek > 20) setIntensity("Intense");
        else setIntensity("Balanced");
    } else if (prefs.timeline === "Standard") {
        if (prefs.hoursPerWeek > 30) setIntensity("Intense");
        else setIntensity("Balanced");
    } else {
        setIntensity("Relaxed");
    }
  }, [prefs.hoursPerWeek, prefs.timeline]);

  const getIntensityColor = () => {
      switch(intensity) {
          case "Relaxed": return "text-green-600 bg-green-50 border-green-200";
          case "Balanced": return "text-blue-600 bg-blue-50 border-blue-200";
          case "Intense": return "text-orange-600 bg-orange-50 border-orange-200";
          case "Impossible": return "text-red-600 bg-red-50 border-red-200";
      }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-white font-sans text-gray-900 pb-32">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-6xl grid lg:grid-cols-12 gap-12"
      >
        
        {/* --- LEFT PANEL: CONTEXT --- */}
        <div className="lg:col-span-4 space-y-6">
           {/* Navigation Back */}
           <button 
              onClick={onCancel}
              className="flex items-center gap-2 text-gray-400 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors mb-4"
           >
              <ArrowLeft size={14} /> Back to Skills Audit
           </button>

           <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 sticky top-24">
               <div className="flex items-center gap-2 mb-6 text-gray-400">
                  <Target size={16} />
                  <span className="text-xs font-bold tracking-widest uppercase">Step 3: Strategy</span>
               </div>
               
               <h2 className="text-3xl font-serif font-medium text-gray-900 mb-6 leading-tight">
                 Plan the <br /> <span className="italic text-gray-400">Attack.</span>
               </h2>

               {/* The Context "Card" */}
               <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                      <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Role</p>
                          <p className="font-bold text-gray-900">{roleName}</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Gaps</p>
                          <p className="text-2xl font-serif">{gapCounts.total}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Critical</p>
                          <p className="text-2xl font-serif text-red-600">{gapCounts.critical}</p>
                      </div>
                  </div>
               </div>
               
               {/* Feasibility Warning */}
               <motion.div 
                  layout
                  className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${getIntensityColor()}`}
               >
                   {intensity === "Impossible" ? <AlertTriangle size={20}/> : <Zap size={20} />}
                   <div>
                       <p className="text-xs font-bold uppercase tracking-wider mb-1">Pacing: {intensity}</p>
                       <p className="text-xs opacity-90 leading-relaxed">
                           {intensity === "Impossible" && "You cannot learn critical skills in 2 weeks with minimal hours. Increase hours or Deadline."}
                           {intensity === "Intense" && "This is a bootcamp pace. Expect high workload."}
                           {intensity === "Balanced" && "Sustainable pace for working professionals."}
                           {intensity === "Relaxed" && "Casual learning pace."}
                       </p>
                   </div>
               </motion.div>
           </div>
        </div>

        {/* --- RIGHT PANEL: CONFIGURATION --- */}
        <div className="lg:col-span-8 bg-white space-y-12 lg:pl-10 lg:pt-4">
            
            {/* 1. TIMELINE (The New Feature) */}
            <div className="space-y-4">
               <label className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={16} /> What is your deadline?
               </label>
               <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { id: "Urgent", label: "ASAP", sub: "Interview Prep", icon: <Zap size={20}/>, desc: "Crash courses & cheatsheets. < 1 Month." },
                    { id: "Standard", label: "Steady", sub: "Up-skilling", icon: <Coffee size={20}/>, desc: "Solid fundamentals. 1-3 Months." },
                    { id: "LongTerm", label: "Mastery", sub: "Career Switch", icon: <GraduationCap size={20}/>, desc: "Deep theory & projects. 6+ Months." }
                  ].map((opt) => {
                     const isSelected = prefs.timeline === opt.id;
                     return (
                        <button
                           key={opt.id}
                           onClick={() => setPrefs({ ...prefs, timeline: opt.id as any })}
                           className={`
                              relative p-5 rounded-2xl border text-left transition-all duration-300 group flex flex-col justify-between min-h-[140px]
                              ${isSelected 
                                 ? "bg-black border-black text-white shadow-xl scale-[1.02]" 
                                 : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
                           `}
                        >
                           <div className="flex justify-between items-start w-full">
                               <div className={`text-lg font-serif font-medium ${isSelected ? "text-white" : "text-gray-900"}`}>{opt.label}</div>
                               <div className={isSelected ? "text-gray-400" : "text-gray-400"}>{opt.icon}</div>
                           </div>
                           
                           <div>
                               <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isSelected ? "text-gray-400" : "text-blue-600"}`}>{opt.sub}</div>
                               <div className={`text-[10px] leading-relaxed ${isSelected ? "text-gray-500" : "text-gray-500"}`}>{opt.desc}</div>
                           </div>
                        </button>
                     )
                  })}
               </div>
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* 2. HOURS (Context Aware) */}
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                     <Clock size={16} /> Availability
                  </label>
                  <div className="font-serif text-2xl font-medium">
                     {prefs.hoursPerWeek} <span className="text-sm font-sans text-gray-400 font-normal">hours / week</span>
                  </div>
               </div>
               
               <div className="relative h-12 flex items-center select-none group">
                  <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                     <motion.div 
                        className={`h-full rounded-full ${intensity === "Impossible" ? "bg-red-500" : "bg-black"}`}
                        style={{ width: `${(prefs.hoursPerWeek / 40) * 100}%` }}
                     />
                  </div>
                  <input 
                     type="range" min="2" max="40" step="2"
                     value={prefs.hoursPerWeek}
                     onChange={(e) => setPrefs({ ...prefs, hoursPerWeek: parseInt(e.target.value) })}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <motion.div 
                     className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center pointer-events-none z-10"
                     style={{ left: `calc(${(prefs.hoursPerWeek / 40) * 100}% - 16px)` }}
                  >
                     <div className={`w-2 h-2 rounded-full ${intensity === "Impossible" ? "bg-red-500" : "bg-black"}`} />
                  </motion.div>
               </div>
               <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Weekend Warrior</span>
                  <span>Full Time</span>
               </div>
            </div>

            {/* ACTION */}
            <div className="pt-8 flex justify-end">
               <button 
                  onClick={() => onSubmit(prefs)}
                  disabled={intensity === "Impossible"}
                  className="bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl font-bold text-sm tracking-widest uppercase flex items-center gap-4 transition-all shadow-xl hover:-translate-y-1"
               >
                  Generate Blueprint
                  <ArrowRight size={20} />
               </button>
            </div>

        </div>
      </motion.div>
    </div>
  );
};