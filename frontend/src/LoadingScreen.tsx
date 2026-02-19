import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Server, BrainCircuit, Database } from "lucide-react";

const STEPS = [
  { id: 1, label: "Extracting Competencies...", icon: BrainCircuit },
  { id: 2, label: "Analysing Skill Dependencies...", icon: Server },
  { id: 3, label: "Querying Resource Database...", icon: Database },
  { id: 4, label: "Constructing Learning Path...", icon: CheckCircle2 },
];

export const LoadingScreen = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2000); // Fake progress steps every 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
          <motion.div 
            className="absolute inset-0 border-4 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrainCircuit size={32} className="text-gray-900" />
          </div>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-medium mb-2">Architecting Strategy</h2>
           <p className="text-gray-500 text-sm">Please wait while our agents analyze the data.</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-left space-y-4">
           {STEPS.map((step, idx) => {
             const Icon = step.icon;
             const isActive = idx === activeStep;
             const isDone = idx < activeStep;
             
             return (
               <motion.div 
                 key={step.id}
                 initial={{ opacity: 0.5, x: -10 }}
                 animate={{ opacity: isDone || isActive ? 1 : 0.4, x: 0 }}
                 className="flex items-center gap-3"
               >
                 <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                    ${isDone ? "bg-green-500 text-white" : isActive ? "bg-black text-white animate-pulse" : "bg-gray-200 text-gray-400"}
                 `}>
                    {isDone ? <CheckCircle2 size={12}/> : isActive ? <Loader2 size={10} className="animate-spin"/> : idx + 1}
                 </div>
                 <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                 </span>
               </motion.div>
             )
           })}
        </div>
      </motion.div>
    </div>
  );
};