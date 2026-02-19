import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Target,
  Trophy,
  AlertCircle,
  HelpCircle,
  FileText,
  Quote,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Award
} from "lucide-react";
import { SkillData } from "../../types";

interface Props {
  roleName: string;
  skillsList: SkillData[];
  scannedLevels: Record<string, number>;
  onSubmit: (skills: Record<string, number>) => void;
  onCancel: () => void;
}

const toBackendLevel = (uiVal: number) => {
  if (uiVal <= 0) return 0;
  if (uiVal <= 1) return 1;
  if (uiVal <= 5) return 3;
  if (uiVal <= 8) return 4;
  return 5;
};

const mapBackendToUi = (backendVal: number) => {
  if (backendVal <= 0) return 0;
  if (backendVal === 1) return 1;
  if (backendVal === 2 || backendVal === 3) return 5;
  if (backendVal === 4) return 8;
  return 10;
};

const LEVELS = [
  { val: 0, label: "None", short: "0", desc: "No experience", color: "text-gray-400", bg: "bg-gray-50", ring: "ring-gray-200" },
  { val: 1, label: "Novice", short: "Jr", desc: "Need guidance", color: "text-orange-500", bg: "bg-orange-50", ring: "ring-orange-200" },
  { val: 5, label: "Competent", short: "Mid", desc: "Independent", color: "text-blue-500", bg: "bg-blue-50", ring: "ring-blue-200" },
  { val: 8, label: "Proficient", short: "Sr", desc: "Complex solver", color: "text-indigo-500", bg: "bg-indigo-50", ring: "ring-indigo-200" },
  { val: 10, label: "Expert", short: "Lead", desc: "Architect/Mentor", color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200" }
];

export const SkillAssessment = ({ roleName, skillsList, scannedLevels, onSubmit, onCancel }: Props) => {
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!Array.isArray(skillsList)) return;

    const initialRatings: Record<string, number> = {};
    skillsList.forEach(item => {
      const skillName = item.skill;
      let detectedUiLevel = 0;

      const matchKey = Object.keys(scannedLevels).find(
        k =>
          k.toLowerCase().includes(skillName.toLowerCase()) ||
          skillName.toLowerCase().includes(k.toLowerCase())
      );

      if (matchKey && scannedLevels[matchKey] > 0) {
        detectedUiLevel = mapBackendToUi(scannedLevels[matchKey]);
      }

      initialRatings[skillName] = detectedUiLevel;
    });

    setUserRatings(initialRatings);
  }, [skillsList, scannedLevels]);

  const stats = useMemo(() => {
    let currentScore = 0;
    let maxScore = 0;
    let criticalGaps = 0;

    skillsList.forEach(s => {
      const rating = userRatings[s.skill] || 0;
      const weight = s.importance === "Critical" ? 2 : 1;

      maxScore += 10 * weight;
      currentScore += rating * weight;

      if (s.importance === "Critical" && rating < 5) criticalGaps++;
    });

    const percentage = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
    return { percentage, criticalGaps, totalSkills: skillsList.length };
  }, [userRatings, skillsList]);

  const buildBackendPayload = (ratings: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const [skill, val] of Object.entries(ratings)) out[skill] = toBackendLevel(val);
    return out;
  };

  const handleRate = (skill: string, val: number) => {
    setUserRatings(prev => ({ ...prev, [skill]: val }));
  };

  const criticalSkills = skillsList.filter(s => s.importance === "Critical");
  const bonusSkills = skillsList.filter(s => s.importance !== "Critical");

  const scoreMessage =
    stats.percentage < 40
      ? { text: "Significant gaps found. We build from the ground up.", icon: AlertCircle, color: "text-red-500" }
      : stats.percentage < 75
      ? { text: "Solid foundation. We bridge the critical gaps.", icon: TrendingUp, color: "text-yellow-500" }
      : { text: "Nearly ready. We polish advanced topics.", icon: Award, color: "text-green-500" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 font-sans text-gray-900 pb-24 lg:pb-0">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-[140px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-200/40 to-pink-200/40 rounded-full blur-[140px] animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "2s" }}
        />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-indigo-400/30 rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <button onClick={onCancel} className="group flex items-center gap-2 text-gray-500 hover:text-black transition-all font-bold text-sm" type="button">
            <div className="p-2.5 bg-white rounded-xl border border-gray-200 group-hover:border-black group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            <span className="hidden sm:inline">Back to Overview</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
            <Sparkles size={14} />
            <span>Skill Calibration</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl shadow-indigo-200/20 border border-white/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Target size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Role</span>
                </div>

                <h1 className="font-serif text-3xl font-bold leading-tight text-gray-900 mb-8">{roleName}</h1>

                <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white rounded-2xl p-6 relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          Match Score
                        </span>
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }} className="mt-2">
                          <span
                            className={`text-6xl font-serif font-bold ${
                              stats.percentage > 70 ? "text-green-400" : stats.percentage > 40 ? "text-yellow-400" : "text-red-400"
                            }`}
                          >
                            {stats.percentage}
                          </span>
                          <span className="text-2xl text-gray-400 font-serif">%</span>
                        </motion.div>
                      </div>

                      <div
                        className={`p-3 rounded-xl ${
                          stats.percentage > 70 ? "bg-green-500/20" : stats.percentage > 40 ? "bg-yellow-500/20" : "bg-red-500/20"
                        }`}
                      >
                        <scoreMessage.icon className={scoreMessage.color} size={24} />
                      </div>
                    </div>

                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm mb-4">
                      <motion.div
                        className={`absolute inset-y-0 left-0 rounded-full ${
                          stats.percentage > 70
                            ? "bg-gradient-to-r from-green-400 to-emerald-500"
                            : stats.percentage > 40
                            ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                            : "bg-gradient-to-r from-red-400 to-rose-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        style={{ width: "50%" }}
                      />
                    </div>

                    <div className="flex items-start gap-2">
                      <scoreMessage.icon className={scoreMessage.color} size={16} />
                      <p className="text-xs text-gray-300 leading-relaxed font-medium">{scoreMessage.text}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 relative overflow-hidden group cursor-pointer">
                    <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trophy size={40} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-blue-500 mb-2 p-2 bg-white rounded-lg w-fit shadow-sm">
                        <Trophy size={18} />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{stats.totalSkills}</div>
                      <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Total Skills</div>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4 border border-red-100 relative overflow-hidden group cursor-pointer">
                    <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
                      <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-red-500 mb-2 p-2 bg-white rounded-lg w-fit shadow-sm">
                        <AlertCircle size={18} />
                      </div>
                      <div className="text-3xl font-bold text-red-700">{stats.criticalGaps}</div>
                      <div className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Critical Gaps</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <div className="hidden lg:block">
              <motion.button
                onClick={() => onSubmit(buildBackendPayload(userRatings))}
                disabled={stats.totalSkills === 0}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-gradient-to-r from-black via-gray-900 to-black text-white rounded-2xl font-bold text-lg shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                type="button"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                  style={{ width: "50%" }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  Generate My Roadmap
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <p className="text-center text-xs text-gray-500 mt-4 font-medium px-4">🎯 Custom path based on your skill profile</p>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-gray-200 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Rate Your Skills</h2>
                <p className="text-gray-500 text-sm">Honest assessment means a better roadmap.</p>
              </div>

              <motion.button
                onClick={() => setShowGuide(!showGuide)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-all shadow-sm hover:shadow-md"
                type="button"
              >
                <HelpCircle size={14} />
                {showGuide ? "Hide" : "Show"} Guide
              </motion.button>
            </motion.div>

            <AnimatePresence>
              {showGuide && (
                <motion.div initial={{ height: 0, opacity: 0, y: -10 }} animate={{ height: "auto", opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -10 }} className="overflow-hidden">
                  <div className="bg-gradient-to-br from-white via-indigo-50/30 to-white border border-indigo-100 rounded-3xl p-6 shadow-xl mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <HelpCircle size={16} className="text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Rating Guide</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {LEVELS.map((l, idx) => (
                        <motion.div
                          key={l.val}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`text-center p-4 rounded-xl border ${l.bg} border-gray-200 hover:shadow-md transition-all`}
                        >
                          <div className={`text-2xl font-bold mb-1 ${l.color}`}>{l.short}</div>
                          <div className={`text-sm font-bold mb-1 ${l.color}`}>{l.label}</div>
                          <div className="text-xs text-gray-500 leading-tight">{l.desc}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <section>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-red-100 to-rose-100 text-red-600 rounded-xl shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Critical Requirements</h3>
                  <p className="text-xs text-gray-500">These skills are essential for the role</p>
                </div>
                <span className="ml-auto text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{criticalSkills.length}</span>
              </motion.div>

              <div className="space-y-4">
                {criticalSkills.map((skill, i) => (
                  <SkillRow
                    key={skill.skill}
                    skill={skill}
                    rating={userRatings[skill.skill] || 0}
                    onRate={handleRate}
                    scannedLevel={scannedLevels[skill.skill] || 0}
                    index={i}
                    isCritical={true}
                  />
                ))}
              </div>
            </section>

            {bonusSkills.length > 0 && (
              <section>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 mb-6 pt-10 border-t border-gray-200">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-xl shadow-sm">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Bonus Skills</h3>
                    <p className="text-xs text-gray-500">Nice-to-have competencies</p>
                  </div>
                  <span className="ml-auto text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{bonusSkills.length}</span>
                </motion.div>

                <div className="space-y-4">
                  {bonusSkills.map((skill, i) => (
                    <SkillRow
                      key={skill.skill}
                      skill={skill}
                      rating={userRatings[skill.skill] || 0}
                      onRate={handleRate}
                      scannedLevel={scannedLevels[skill.skill] || 0}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 p-4 lg:hidden z-50 shadow-2xl">
        <motion.button
          onClick={() => onSubmit(buildBackendPayload(userRatings))}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-gradient-to-r from-black via-gray-900 to-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all relative overflow-hidden group"
          type="button"
        >
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity }} style={{ width: "50%" }} />
          <span className="relative z-10 flex items-center gap-3">
            Generate Roadmap ({stats.percentage}%)
            <ArrowRight size={20} className="group-active:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};

const SkillRow = ({
  skill,
  rating,
  onRate,
  scannedLevel,
  index,
  isCritical = false
}: {
  skill: SkillData;
  rating: number;
  onRate: (s: string, v: number) => void;
  scannedLevel: number;
  index: number;
  isCritical?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeLevel = LEVELS.reduce((prev, curr) => (Math.abs(curr.val - rating) < Math.abs(prev.val - rating) ? curr : prev));
  const isMatched = scannedLevel > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className={`relative bg-white rounded-2xl p-5 border transition-all duration-300 shadow-sm hover:shadow-lg ${
        isCritical ? "border-l-4 border-l-red-500 border-y-gray-100 border-r-gray-100" : "border-gray-100 hover:border-blue-200"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-bold text-gray-900 text-lg">{skill.skill}</h4>
            {isMatched && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-[10px] font-bold uppercase bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 px-2 py-1 rounded-full shadow-sm"
              >
                <CheckCircle2 size={10} /> Detected in CV
              </motion.span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1 bg-gray-50 rounded-md">{skill.category}</span>

            {skill.context && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors hover:underline"
                type="button"
              >
                <FileText size={12} />
                {isExpanded ? "Hide" : "View"} Context
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-2xl flex relative shadow-inner">
            <motion.div
              className={`absolute top-2 bottom-2 rounded-xl shadow-lg z-0 ${activeLevel.bg} ${activeLevel.ring} ring-2`}
              layoutId={`pill-${skill.skill}`}
              initial={false}
              animate={{
                width: `calc(20% - 8px)`,
                left: `calc(${LEVELS.findIndex(l => l.val === activeLevel.val) * 20}% + 4px)`
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {LEVELS.map(level => {
              const isSelected = activeLevel.val === level.val;
              return (
                <motion.button
                  key={level.val}
                  onClick={() => onRate(skill.skill, level.val)}
                  whileHover={{ scale: isSelected ? 1 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative z-10 w-14 md:w-16 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                    isSelected ? `${level.color} font-bold` : "text-gray-400 hover:text-gray-600"
                  }`}
                  type="button"
                >
                  <motion.span animate={{ scale: isSelected ? 1.2 : 1 }} className="text-sm font-bold">
                    {level.short}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeLevel.color}`}>{activeLevel.label}</span>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && skill.context && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-indigo-50/80 rounded-2xl p-5 border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-3 left-3 opacity-10">
                  <Quote size={32} className="text-indigo-400" />
                </div>

                <p className="text-sm text-gray-700 leading-relaxed relative z-10 pl-6 border-l-3 border-indigo-300 italic">
                  "{skill.context}"
                </p>

                <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-indigo-100/50 to-transparent rounded-tl-full" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
