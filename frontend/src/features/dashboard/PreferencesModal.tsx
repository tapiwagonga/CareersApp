import React, { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, MonitorPlay, Hammer, Clock, Sparkles, Zap, Coffee, Gamepad2, Rocket, Crown } from "lucide-react";

export interface Preferences {
  experienceLevel: "Junior" | "Mid" | "Senior";
  learningStyle: "Visual" | "Text" | "Hands-on";
  hoursPerWeek: number;
}

interface Props {
  onSubmit: (prefs: Preferences) => void;
  onCancel: () => void;
}

export const PreferencesModal = ({ onSubmit, onCancel }: Props) => {
  const [prefs, setPrefs] = useState<Preferences>({
    experienceLevel: "Mid",
    learningStyle: "Visual",
    hoursPerWeek: 10,
  });

  // Fun, relatable categories
  const levels = [
    { id: "Junior", label: "Just Starting", icon: <Gamepad2 size={18} />, desc: "0-2 Years" },
    { id: "Mid", label: "Climbing", icon: <Rocket size={18} />, desc: "2-5 Years" },
    { id: "Senior", label: "Pro", icon: <Crown size={18} />, desc: "5+ Years" },
  ];

  const styles = [
    { id: "Visual", icon: <MonitorPlay size={28} />, label: "Watcher", desc: "YouTube & Courses 📺" },
    { id: "Text", icon: <BookOpen size={28} />, label: "Reader", desc: "Docs & Articles 📚" },
    { id: "Hands-on", icon: <Hammer size={28} />, label: "Doer", desc: "Building Stuff 🛠️" },
  ];

  // Dynamic "Vibe Check" for the slider
  const getIntensityLabel = (hours: number) => {
    if (hours < 5) return { label: "Chill Mode ☕️", color: "text-slate-400" };
    if (hours < 15) return { label: "Steady Grind 🏃‍♂️", color: "text-emerald-400" };
    if (hours < 25) return { label: "Serious Gains 💪", color: "text-amber-400" };
    return { label: "Monk Mode 🧘‍♂️", color: "text-red-400" }; // >25 hours
  };

  const intensity = getIntensityLabel(prefs.hoursPerWeek);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-8 custom-scrollbar relative z-10">
            
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                    <Sparkles size={12} /> VIBE CHECK
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Let's get personal.</h2>
                <p className="text-slate-400 text-base">
                    Help us customize the AI so it doesn't give you boring advice.
                </p>
            </div>

            <div className="space-y-10">
                
                {/* 1. Experience Level */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-wider block text-center">
                        Where are you at right now?
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                        {levels.map((level) => {
                            const isSelected = prefs.experienceLevel === level.id;
                            return (
                                <button
                                    key={level.id}
                                    onClick={() => setPrefs({ ...prefs, experienceLevel: level.id as any })}
                                    className={`relative py-4 px-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
                                        isSelected ? "bg-slate-800 text-white shadow-lg ring-1 ring-slate-600" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                    }`}
                                >
                                    <div className={isSelected ? "text-emerald-400" : "text-slate-600"}>
                                        {level.icon}
                                    </div>
                                    <div className="text-sm font-bold">{level.label}</div>
                                    <div className="text-[10px] opacity-60 font-medium">{level.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Learning Style */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-wider block text-center">
                        How do you learn best?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {styles.map((style) => {
                            const isSelected = prefs.learningStyle === style.id;
                            return (
                                <button
                                    key={style.id}
                                    onClick={() => setPrefs({ ...prefs, learningStyle: style.id as any })}
                                    className={`relative p-4 rounded-2xl border text-center transition-all group ${
                                        isSelected
                                        ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                                        : "bg-slate-900/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
                                    }`}
                                >
                                    <div className={`mb-3 flex justify-center transition-colors ${isSelected ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400"}`}>
                                        {style.icon}
                                    </div>
                                    <div className="font-bold text-slate-200 text-sm mb-1">{style.label}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{style.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Time Commitment */}
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-6">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                            Time Budget
                        </label>
                        <div className={`text-sm font-bold ${intensity.color} flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800`}>
                            {intensity.label}
                        </div>
                    </div>
                    
                    <div className="relative h-12 flex items-center">
                        <input
                            type="range"
                            min="2"
                            max="40"
                            step="2"
                            value={prefs.hoursPerWeek}
                            onChange={(e) => setPrefs({ ...prefs, hoursPerWeek: parseInt(e.target.value) })}
                            className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 relative z-10"
                        />
                        {/* Custom Track Visuals could go here */}
                    </div>

                    <div className="flex justify-between mt-1 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                        <span>2h / week</span>
                        <span className="text-emerald-500">{prefs.hoursPerWeek}h</span>
                        <span>40h / week</span>
                    </div>
                </div>

            </div>
        </div>

        {/* Footer Actions (Sticky Bottom) */}
        <div className="p-6 border-t border-slate-800/80 bg-[#0f172a]/95 backdrop-blur flex gap-3 z-20">
            <button 
                onClick={onCancel}
                className="px-6 py-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all font-bold text-sm"
            >
                Nah, Skip
            </button>
            <button 
                onClick={() => onSubmit(prefs)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
            >
                Let's Cook 🍳
                <Rocket size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>

      </motion.div>
    </div>
  );
};