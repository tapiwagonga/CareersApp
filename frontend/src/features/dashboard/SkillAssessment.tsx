import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  FileText,
  PieChart
} from "lucide-react";
import { SkillData } from "../../types";

interface Props {
  roleName: string; // <--- NEW PROP for context
  skillsList: SkillData[];
  scannedLevels: Record<string, number>;
  onSubmit: (skills: Record<string, number>) => void;
  onCancel: () => void;
}

const LEVELS = [
  { val: 1, label: "None", desc: "No practical experience", color: "bg-gray-100 text-gray-500" },
  { val: 3, label: "Novice", desc: "Understands basics", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { val: 5, label: "Competent", desc: "Can work independently", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { val: 8, label: "Proficient", desc: "Deep knowledge & best practices", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { val: 10, label: "Expert", desc: "Authority / Architect level", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

export const SkillAssessment = ({ roleName, skillsList, scannedLevels, onSubmit, onCancel }: Props) => {
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ found: 0, total: 0, percentage: 0 });

  // 1. Auto-Calibration & Stats Logic
  useEffect(() => {
    const initialRatings: Record<string, number> = {};
    let foundCount = 0;
    
    skillsList.forEach(item => {
      const skillName = item.skill;
      let detectedLevel = 1;

      // Fuzzy Match Logic
      let matchKey = Object.keys(scannedLevels).find(
          k => k.toLowerCase().includes(skillName.toLowerCase()) || 
               skillName.toLowerCase().includes(k.toLowerCase())
      );
      
      if (scannedLevels[skillName]) matchKey = skillName; // Exact match priority

      if (matchKey && scannedLevels[matchKey] > 1) {
        detectedLevel = scannedLevels[matchKey];
        foundCount++;
      }

      initialRatings[skillName] = detectedLevel;
    });

    setUserRatings(initialRatings);
    setStats({
        found: foundCount,
        total: skillsList.length,
        percentage: Math.round((foundCount / skillsList.length) * 100)
    });

  }, [skillsList, scannedLevels]);

  const handleRate = (skill: string, val: number) => {
    setUserRatings(prev => ({ ...prev, [skill]: val }));
  };

  const getLevelDetails = (rating: number) => {
      return LEVELS.find(l => l.val >= rating) || LEVELS[0];
  };

  if (!skillsList || skillsList.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-6 md:p-12 font-sans text-gray-900 pb-40">
      <div className="w-full max-w-5xl space-y-8">
        
        {/* --- NAVIGATION --- */}
        <div>
            <button 
                onClick={onCancel}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black mb-4 transition-colors"
            >
                <ArrowLeft size={14} /> Back to Upload
            </button>
        </div>

        {/* --- THE EXECUTIVE SUMMARY (NEW) --- */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden"
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                
                {/* Text Summary */}
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-2 text-blue-600">
                        <FileText size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">CV Scan Report</span>
                    </div>
                    
                    <h1 className="text-3xl font-serif font-medium text-gray-900 leading-tight">
                        We analyzed your fit for <br/>
                        <span className="text-gray-400 italic">{roleName}</span>
                    </h1>

                    <p className="text-gray-500 text-sm leading-relaxed">
                        Based on your uploaded CV, we identified <strong>{stats.found} out of {stats.total}</strong> required technical skills. 
                        {stats.percentage < 50 
                            ? " There are significant gaps between your current profile and the role requirements."
                            : " You have a strong baseline, but some specific tool matches are missing."
                        }
                        <br />
                        <span className="text-black font-bold">Please verify our findings below.</span>
                    </p>
                </div>

                {/* Stat Circle */}
                <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-gray-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                            <motion.path 
                                className={`${stats.percentage > 70 ? "text-green-500" : stats.percentage > 40 ? "text-blue-500" : "text-orange-500"}`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeDasharray={`${stats.percentage}, 100`}
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${stats.percentage}, 100` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute font-bold text-lg">{stats.percentage}%</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">Match Rate</div>
                        <div className="text-sm font-bold">{stats.found} Skills Found</div>
                        <div className="text-xs text-gray-400">{stats.total - stats.found} Missing</div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* --- AUDIT LIST --- */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 text-gray-400 pl-2">
                <SlidersHorizontal size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Detailed Calibration</span>
           </div>

           {skillsList.map((item, idx) => {
              const currentRating = userRatings[item.skill] || 1;
              const levelObj = getLevelDetails(currentRating);
              
              // Check scanning result
              let initialScanLevel = 0;
              const matchKey = Object.keys(scannedLevels).find(k => k.toLowerCase().includes(item.skill.toLowerCase()));
              if (matchKey) initialScanLevel = scannedLevels[matchKey];
              const isDetected = initialScanLevel > 1;

              return (
                 <motion.div 
                    key={item.skill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group bg-white rounded-2xl border p-6 md:p-8 transition-all duration-300 ${
                        isDetected ? "border-green-200 shadow-green-500/5" : "border-gray-200"
                    } hover:shadow-xl hover:border-blue-300`}
                 >
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                       
                       {/* LEFT: THE REQUIREMENT */}
                       <div className="space-y-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">{item.skill}</h3>
                                {item.importance === "Critical" && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-600 tracking-wider border border-red-100">
                                        Critical
                                    </span>
                                )}
                                {isDetected && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-50 text-green-600 tracking-wider border border-green-100 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Match
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{item.category}</p>
                          </div>
                          
                          {/* Evidence Block */}
                          <div className="relative pl-4 border-l-2 border-gray-100 italic text-gray-600 text-sm">
                             "{item.evidence}"
                             <div className="text-[10px] text-gray-400 not-italic mt-1 font-bold uppercase tracking-wider">
                                Context: {item.context}
                             </div>
                          </div>
                       </div>

                       {/* RIGHT: THE CALIBRATION */}
                       <div className="flex flex-col justify-center">
                          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                              
                              <div className="flex justify-between items-center mb-6">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <SlidersHorizontal size={12} /> Your Level
                                 </label>
                                 <div className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${levelObj.color}`}>
                                    {levelObj.label} ({currentRating}/10)
                                 </div>
                              </div>

                              <div className="relative h-12 flex items-center px-2 select-none">
                                 {/* Track */}
                                 <div className="absolute inset-0 h-2 bg-gray-100 rounded-full top-1/2 -translate-y-1/2 w-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-gray-900 rounded-full" 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(currentRating / 10) * 100}%` }}
                                    />
                                 </div>
                                 <input 
                                    type="range" min="1" max="10" step="1"
                                    value={currentRating}
                                    onChange={(e) => handleRate(item.skill, parseInt(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                 />
                                 <motion.div 
                                    className="absolute w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg z-10 pointer-events-none top-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-bold text-gray-500"
                                    animate={{ left: `calc(${(currentRating / 10) * 100}% - 16px)` }}
                                 >
                                    {currentRating}
                                 </motion.div>
                              </div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold text-center mt-3">{levelObj.desc}</p>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              );
           })}
        </div>

        {/* --- FOOTER ACTION --- */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 md:p-6 z-40">
           <div className="max-w-5xl mx-auto flex justify-end items-center">
              <button 
                onClick={() => onSubmit(userRatings)}
                className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide flex items-center gap-3 shadow-2xl hover:-translate-y-1 transition-all"
              >
                 Confirm & Plan Strategy <ArrowRight size={18} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};