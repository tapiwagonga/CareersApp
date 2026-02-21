import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";
import { Check, Lock, Star, Target, Zap, Clock, Award } from "lucide-react";
import { RoadmapPhase } from "../../types";

interface RoadmapPathProps {
  phases: RoadmapPhase[];
  activePhaseId: number;
  onPhaseSelect: (index: number) => void;
  avatarConfig?: any;
}

type Cert = {
  name: string;
  issuer: string;
  query: string;
};

function certsForSkill(skill: string): Cert[] {
  const s = (skill || "").toLowerCase();

  if (s.includes("aws") || s.includes("amazon web services")) {
    return [
      { name: "Solutions Architect Associate", issuer: "AWS", query: "AWS Solutions Architect Associate" },
      { name: "Developer Associate", issuer: "AWS", query: "AWS Developer Associate" }
    ];
  }

  if (s.includes("azure")) {
    return [
      { name: "AZ 204 Developer", issuer: "Microsoft", query: "Microsoft AZ 204" },
      { name: "AZ 104 Administrator", issuer: "Microsoft", query: "Microsoft AZ 104" }
    ];
  }

  if (s.includes("kubernetes") || s.includes("k8s")) {
    return [
      { name: "CKA", issuer: "CNCF", query: "Certified Kubernetes Administrator CKA" },
      { name: "CKAD", issuer: "CNCF", query: "Certified Kubernetes Application Developer CKAD" }
    ];
  }

  if (s.includes("terraform")) {
    return [
      { name: "Terraform Associate", issuer: "HashiCorp", query: "HashiCorp Terraform Associate" }
    ];
  }

  if (s.includes("react")) {
    return [
      { name: "Meta Front End", issuer: "Meta", query: "Meta Front End Developer Professional Certificate" }
    ];
  }

  if (s.includes("security") || s.includes("secure")) {
    return [
      { name: "Security Plus", issuer: "CompTIA", query: "CompTIA Security Plus" }
    ];
  }

  return [];
}

function googleSearchUrl(q: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export const RoadmapPath = ({
  phases,
  activePhaseId,
  onPhaseSelect,
  avatarConfig
}: RoadmapPathProps) => {
  const defaultConfig = useMemo(() => genConfig(), []);
  const config = avatarConfig || defaultConfig;

  const progressPercent = phases.length > 0 ? ((activePhaseId - 1) / phases.length) * 100 : 0;

  return (
    <div className="relative py-10 px-4">
      <div className="absolute left-[38px] top-0 bottom-0 w-1 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 via-gray-100 to-gray-200" />

        <motion.div
          initial={{ height: "0%" }}
          animate={{ height: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-emerald-400 via-green-500 to-emerald-600 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
        />

        <motion.div
          initial={{ top: "0%" }}
          animate={{ top: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
        />
      </div>

      <div className="space-y-8 relative z-10">
        {phases.map((phase, index) => {
          const phaseNum = index + 1;
          const isActive = phaseNum === activePhaseId;
          const isPast = phaseNum < activePhaseId;
          const isLocked = phaseNum > activePhaseId;
          const isNext = phaseNum === activePhaseId + 1;

          const completedTasks =
            phase.tasks?.filter((t: any) => t.status === "Completed" || t.status === "Done" || t.is_completed).length || 0;
          const totalTasks = phase.tasks?.length || 0;
          const phaseProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          const certs = certsForSkill(phase.focus_area);

          return (
            <motion.div
              key={`${phase.week_number}-${index}`}
              className="relative pl-16"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <button
                onClick={() => !isLocked && onPhaseSelect(phaseNum)}
                disabled={isLocked}
                type="button"
                className={`
                  absolute left-5 -translate-x-1/2 w-10 h-10 rounded-full border-4
                  flex items-center justify-center transition-all duration-300 z-20
                  ${isActive
                    ? "bg-black border-black scale-125 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                    : isPast
                      ? "bg-gradient-to-br from-emerald-400 to-green-600 border-emerald-500"
                      : isNext
                        ? "bg-white border-gray-400 animate-pulse"
                        : "bg-white border-gray-200 scale-90"}
                `}
              >
                {isPast ? (
                  <Check className="text-white" size={16} strokeWidth={3} />
                ) : isActive ? (
                  <Target className="text-white" size={16} />
                ) : isLocked ? (
                  <Lock className="text-gray-300" size={14} />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </button>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="avatar-walker"
                    className="absolute left-5 -translate-x-1/2 -top-16 z-30"
                    initial={{ y: -30, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 30, opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-400/30 to-purple-500/30 rounded-full blur-xl scale-150" />

                    <div className="relative w-14 h-14 rounded-full border-4 border-white bg-white overflow-hidden shadow-2xl">
                      <ReactNiceAvatar style={{ width: "100%", height: "100%" }} {...config} />
                    </div>

                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-lg flex items-center gap-0.5"
                    >
                      <Zap size={8} fill="white" />
                      NOW
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => !isLocked && onPhaseSelect(phaseNum)}
                disabled={isLocked}
                type="button"
                whileHover={!isLocked ? { scale: 1.02, x: 4 } : {}}
                whileTap={!isLocked ? { scale: 0.98 } : {}}
                className={`
                  relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden
                  ${isActive
                    ? "bg-white border-black shadow-lg"
                    : isPast
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                      : isLocked
                        ? "bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed"
                        : "bg-white border-gray-200 hover:border-gray-300"}
                `}
              >
                {isActive && (
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${phaseProgress}%` }}
                    className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}

                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`
                      text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md
                      ${isActive
                        ? "bg-black text-white"
                        : isPast
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"}
                    `}
                  >
                    {phase.label?.split(":")[0] || `Phase ${phaseNum}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {isPast && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <Star size={14} className="text-yellow-500 fill-yellow-400" />
                      </motion.div>
                    )}

                    {isActive && phaseProgress > 0 && (
                      <span className="text-[10px] font-bold text-blue-600">
                        {Math.round(phaseProgress)}%
                      </span>
                    )}
                  </div>
                </div>

                <h3
                  className={`
                    font-bold text-sm leading-tight mb-1 transition-colors
                    ${isActive ? "text-gray-900" : isLocked ? "text-gray-400" : "text-gray-700"}
                  `}
                >
                  {phase.focus_area}
                </h3>

                <p className={`text-xs line-clamp-2 mb-3 ${isActive ? "text-gray-600" : "text-gray-500"}`}>
                  {phase.description?.split("[")[0] || ""}
                </p>

                {certs.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {certs.slice(0, 2).map(c => (
                      <a
                        key={`${c.issuer}-${c.name}`}
                        href={googleSearchUrl(c.query)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold"
                      >
                        <Award size={12} />
                        <span className="truncate max-w-[180px]">{c.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] font-medium text-gray-400">
                  {phase.start_date && <span className="flex items-center gap-1">📅 {phase.start_date}</span>}

                  {totalTasks > 0 && (
                    <span className="flex items-center gap-1">
                      <Target size={10} />
                      {completedTasks}/{totalTasks} Done
                    </span>
                  )}

                  {phase.total_hours ? (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {phase.total_hours}h
                    </span>
                  ) : null}
                </div>

                {isLocked && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl pointer-events-none">
                    <div className="text-gray-400 flex flex-col items-center gap-1">
                      <Lock size={20} />
                      <span className="text-[10px] font-bold">Complete previous phases</span>
                    </div>
                  </div>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {activePhaseId > phases.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-xl text-center"
        >
          <div className="text-2xl mb-1">🎉</div>
          <div className="font-bold text-sm text-gray-900">Journey complete</div>
          <div className="text-xs text-gray-600">All phases mastered</div>
        </motion.div>
      )}
    </div>
  );
};


