import React, { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Building2, ArrowRight, FileText, X } from "lucide-react";

interface Props {
  initialRole?: string;
  initialCompany?: string;
  onStart: (role: string, company: string, jd: string) => void;
  onCancel: () => void;
}

export const InterviewSetup = ({ initialRole = "", initialCompany = "", onStart, onCancel }: Props) => {
  const [role, setRole] = useState(initialRole);
  const [company, setCompany] = useState(initialCompany);
  const [jd, setJd] = useState("");

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
    >
      <div className="p-8 pb-6 border-b border-gray-100 flex justify-between items-start">
         <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Interview Setup</h2>
            <p className="text-sm text-gray-500">Configure your AI hiring manager.</p>
         </div>
         <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
             <X size={20} />
         </button>
      </div>

      <div className="p-8 space-y-5">
         
         <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Target Role</label>
            <div className="relative group">
               <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
               <input 
                 value={role}
                 onChange={(e) => setRole(e.target.value)}
                 placeholder="e.g. Senior Product Manager"
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 font-medium text-gray-900 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 outline-none transition-all"
               />
            </div>
         </div>

         <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Company (Optional)</label>
            <div className="relative group">
               <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
               <input 
                 value={company}
                 onChange={(e) => setCompany(e.target.value)}
                 placeholder="e.g. Amazon"
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 font-medium text-gray-900 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 outline-none transition-all"
               />
            </div>
         </div>

         <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Job Context (Optional)</label>
            <div className="relative group">
               <FileText className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
               <textarea 
                 value={jd}
                 onChange={(e) => setJd(e.target.value)}
                 placeholder="Paste the job description or key requirements here to tailor the questions..."
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 font-medium text-gray-900 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 outline-none transition-all min-h-[100px] resize-none text-sm leading-relaxed"
               />
            </div>
         </div>

         <button 
           disabled={!role.trim()}
           onClick={() => onStart(role, company, jd)}
           className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
         >
           <span>Initialize Session</span>
           <ArrowRight size={18} />
         </button>
      </div>
    </motion.div>
  );
};