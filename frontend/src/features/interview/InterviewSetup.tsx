import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, Building2, ArrowRight, FileText, X, Settings2, Mic, Brain } from "lucide-react";

interface Props {
  initialRole?: string;
  initialCompany?: string;
  initialJd?: string;
  onStart: (role: string, company: string, jd: string, voice: string, style: string) => void;
  onCancel: () => void;
}

const getStoredItem = (key: string, fallback: string) => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || fallback;
  }
  return fallback;
};

export const InterviewSetup = ({ initialRole = "", initialCompany = "", initialJd = "", onStart, onCancel }: Props) => {
  const [role, setRole] = useState(() => initialRole || getStoredItem("skillgap_interview_role", ""));
  const [company, setCompany] = useState(() => initialCompany || getStoredItem("skillgap_interview_company", ""));
  const [jd, setJd] = useState(() => initialJd || getStoredItem("skillgap_interview_jd", ""));
  const [voice, setVoice] = useState(() => getStoredItem("skillgap_interview_voice", "uk-female"));
  const [style, setStyle] = useState(() => getStoredItem("skillgap_interview_style", "balanced"));

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("skillgap_interview_role", role);
      localStorage.setItem("skillgap_interview_company", company);
      localStorage.setItem("skillgap_interview_jd", jd);
      localStorage.setItem("skillgap_interview_voice", voice);
      localStorage.setItem("skillgap_interview_style", style);
    }
  }, [role, company, jd, voice, style]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl shadow-slate-900/10 overflow-hidden border border-slate-200 relative z-50 flex flex-col max-h-[90vh] mx-4"
    >
      <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-md">
                <Settings2 size={24} strokeWidth={2} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Session Configuration</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Define the parameters for your technical evaluation.</p>
            </div>
         </div>
         <button onClick={onCancel} className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm">
             <X size={20} />
         </button>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto bg-white">
         <div className="grid md:grid-cols-2 gap-6">
             <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Target Role</label>
                <div className="relative group">
                   <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                   <input 
                     value={role}
                     onChange={(e) => setRole(e.target.value)}
                     placeholder="e.g. Frontend Engineer"
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                   />
                </div>
             </div>

             <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Institution / Company</label>
                <div className="relative group">
                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                   <input 
                     value={company}
                     onChange={(e) => setCompany(e.target.value)}
                     placeholder="e.g. JPMorgan Chase"
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                   />
                </div>
             </div>
         </div>

         <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Technical Context</label>
            <div className="relative group">
               <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
               <textarea 
                 value={jd}
                 onChange={(e) => setJd(e.target.value)}
                 placeholder="Paste specific requirements, tech stack, or syllabus topics to tailor the assessment..."
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all min-h-[120px] resize-none leading-relaxed"
               />
            </div>
         </div>

         <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
             <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Mic className="text-indigo-500" size={16}/> Evaluator Voice
                </label>
                <div className="grid grid-cols-2 gap-3">
                   {[
                     { id: "uk-female", label: "UK Female" },
                     { id: "uk-male", label: "UK Male" },
                     { id: "us-female", label: "US Female" },
                     { id: "us-male", label: "US Male" }
                   ].map(v => (
                     <button
                       key={v.id}
                       onClick={() => setVoice(v.id)}
                       className={`px-3 py-3.5 rounded-xl text-xs font-bold transition-all border text-center ${
                           voice === v.id 
                           ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm ring-1 ring-indigo-200" 
                           : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                     >
                       {v.label}
                     </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Brain className="text-emerald-500" size={16}/> Assessment Style
                </label>
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { id: "balanced", label: "Balanced & Fair" },
                     { id: "strict", label: "Strict & Technical" },
                     { id: "casual", label: "Conversational" }
                   ].map(s => (
                     <button
                       key={s.id}
                       onClick={() => setStyle(s.id)}
                       className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex justify-between items-center ${
                           style === s.id 
                           ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm ring-1 ring-emerald-200" 
                           : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                     >
                       {s.label}
                       {style === s.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                     </button>
                   ))}
                </div>
             </div>
         </div>
      </div>

      <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
         <button 
           disabled={!role.trim()}
           onClick={() => onStart(role, company, jd, voice, style)}
           className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
         >
           Initialise Protocol
           <ArrowRight size={18} />
         </button>
      </div>
    </motion.div>
  );
};