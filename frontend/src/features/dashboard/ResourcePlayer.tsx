import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, CheckCircle2, ExternalLink, 
  Award, Star, ChevronRight, AlertCircle, Clock 
} from "lucide-react";
import { RoadmapTask } from "../../types";

interface Props {
  task: RoadmapTask | null;
  onClose: () => void;
  onComplete: (rating?: number) => void;
}

export const ResourcePlayer = ({ task, onClose, onComplete }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [duration, setDuration] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setShowReview(false);
    setHasTriggeredComplete(false);
    setRating(0);
  }, [task]);

  if (!task) return null;

  const isVideo = task.type === "video" || task.type === "Watch";

  // --- HANDLERS ---

  // 1. Progress Handler (Casts state to any to avoid HTMLVideoElement mismatch)
  const handleProgress = (state: any) => {
    if (!isVideo || !state) return;
    
    // Safety check: ensure 'played' exists (0 to 1)
    const pct = state.played || 0;
    setProgress(pct);

    // Check status string (Fixes 'is_completed' error)
    const isAlreadyDone = task.status === "Completed" || task.status === "Done";

    // Auto-mark at 75%
    if (pct > 0.75 && !hasTriggeredComplete && !isAlreadyDone) {
      setHasTriggeredComplete(true);
    }
  };
  const handleDurationChange: React.ReactEventHandler<HTMLVideoElement> = (event) => {
    const duration = event.currentTarget.duration; // number (in seconds)
    setDuration(duration);
  };

  const handleFinish = () => {
    setShowReview(true);
  };

  const submitReview = () => {
    onComplete(rating);
    onClose();
  };

  return (
    <AnimatePresence>
      {task && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-8"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-6xl bg-[#0F172A] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col md:flex-row h-[85vh]">
            
            {/* LEFT: CONTENT PLAYER */}
            <div className="flex-1 bg-black relative flex flex-col justify-center">
              {isVideo ? (
                <div className="relative w-full h-full">
                    <ReactPlayer
                        src={task.meta?.url || ""}
                        width="100%"
                        height="100%"
                        playing={playing}
                        controls={true}
                        onProgress={handleProgress}
                        onDurationChange={handleDurationChange} // Correct prop
                        onEnded={handleFinish}
                        config={{ 
                            youtube: { 
                                playerVars: { showinfo: 1, modestbranding: 1 } 
                            } as any
                        }}
                    />
                    
                    {/* Custom Progress Bar (Visible if controls hide) */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800 pointer-events-none">
                        <motion.div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${progress * 100}%` }} 
                        />
                    </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-6">
                    <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
                        <ExternalLink size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-white max-w-lg">{task.title}</h2>
                    <p className="text-gray-400 max-w-md">This resource is hosted externally.</p>
                    
                    <a 
                        href={task.meta?.url} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => setProgress(1)} 
                        className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-3"
                    >
                        Open Resource <ExternalLink size={18} />
                    </a>
                </div>
              )}
            </div>

            {/* RIGHT: CONTEXT & ACTIONS */}
            <div className="w-full md:w-[400px] bg-[#1E293B] p-8 flex flex-col border-l border-gray-800 relative overflow-hidden">
                
                <div className="mb-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            isVideo ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                            {task.type}
                        </span>
                        {hasTriggeredComplete && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-widest animate-pulse">
                                <CheckCircle2 size={12} /> XP Earned
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4 leading-tight">{task.title}</h1>
                    <div className="text-gray-400 text-sm leading-relaxed space-y-4">
                        <p>{task.description}</p>
                        {task.estimated_minutes && (
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={14} /> 
                                <span>Est: {task.estimated_minutes} min</span>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showReview && (
                        <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }}
                            className="absolute inset-0 bg-[#1E293B] p-8 z-20 flex flex-col justify-center items-center text-center"
                        >
                            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mb-4">
                                <Award size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Resource Complete!</h3>
                            <p className="text-gray-400 text-sm mb-6">How useful was this content?</p>
                            
                            <div className="flex gap-2 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`p-2 transition-all ${rating >= star ? "text-yellow-400 scale-110" : "text-gray-600 hover:text-gray-400"}`}
                                    >
                                        <Star size={28} fill={rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={submitReview}
                                disabled={rating === 0}
                                className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 hover:scale-105 transition-all"
                            >
                                Complete & Collect XP
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showReview && (
                    <div className="mt-8 space-y-4">
                        {isVideo && (
                            <div className="bg-gray-800 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>Progress</span>
                                    <span>{Math.round(progress * 100)}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-indigo-500"
                                        animate={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                                {progress < 0.75 && !hasTriggeredComplete && (
                                    <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                                        <AlertCircle size={10} /> Watch 75% to auto-complete
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={() => setShowReview(true)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                        >
                            Mark as Complete <ChevronRight size={18} />
                        </button>
                    </div>
                )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};