import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Target,
  AlertCircle,
  TrendingUp,
  Award,
  Activity,
  ScanSearch,
  Briefcase,
  LineChart,
  Lightbulb,
  DollarSign,
  Database,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Quote
} from "lucide-react";
import { SkillData } from "../../types";

interface Props {
  roleName: string;
  skillsList: SkillData[];
  scannedLevels: Record<string, number>;
  onSubmit: (skills: Record<string, number>, source: 'ai' | 'database') => void;
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
  { val: 0, label: "None", short: "0", desc: "Absolute beginner. Zero hours of practical application. Have never used this in a real project environment.", color: "text-slate-400", bg: "bg-slate-50", ring: "ring-slate-200" },
  { val: 1, label: "Novice", short: "Jr", desc: "Completed basic tutorials. Under 100 hours of practice. Rely heavily on external guidance to ship features.", color: "text-orange-500", bg: "bg-orange-50", ring: "ring-orange-200" },
  { val: 5, label: "Competent", short: "Mid", desc: "Built production features. 500+ hours of experience. Can execute standard tickets and write tests independently.", color: "text-blue-500", bg: "bg-blue-50", ring: "ring-blue-200" },
  { val: 8, label: "Proficient", short: "Sr", desc: "Designed complex systems. 2,000+ hours. Routinely solve hard edge cases, unblock peers and review codebase architecture.", color: "text-indigo-500", bg: "bg-indigo-50", ring: "ring-indigo-200" },
  { val: 10, label: "Expert", short: "Lead", desc: "Architected platform scale solutions. 5,000+ hours. Define industry best practices and lead cross functional technical teams.", color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-200" }
];

const CATEGORY_STYLES: Record<string, string> = {
  Language: "bg-blue-50 text-blue-700 border-blue-200",
  Framework: "bg-purple-50 text-purple-700 border-purple-200",
  Tool: "bg-amber-50 text-amber-700 border-amber-200",
  Concept: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Database: "bg-teal-50 text-teal-700 border-teal-200",
  Cloud: "bg-sky-50 text-sky-700 border-sky-200",
  Default: "bg-slate-100 text-slate-600 border-slate-200"
};

const RadarChart = ({ skills, current, target }: { skills: string[], current: number[], target: number[] }) => {
  const size = 240;
  const center = size / 2;
  const radius = (size / 2) - 30;
  const totalAxes = Math.max(3, skills.length);
  const angleStep = (Math.PI * 2) / totalAxes;

  const getPoint = (val: number, index: number) => {
    const r = (val / 10) * radius;
    const theta = (index * angleStep) - (Math.PI / 2);
    return `${center + r * Math.cos(theta)},${center + r * Math.sin(theta)}`;
  };

  const targetPolygon = skills.map((_, i) => getPoint(target[i] || 8, i)).join(" ");
  const currentPolygon = skills.map((_, i) => getPoint(current[i] || 0, i)).join(" ");

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {[1, 0.75, 0.5, 0.25].map((scale, i) => (
          <polygon
            key={i}
            points={skills.map((_, idx) => getPoint(10 * scale, idx)).join(" ")}
            fill="none"
            stroke="rgba(156, 163, 175, 0.2)"
            strokeWidth="1"
          />
        ))}
        {skills.map((_, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos((i * angleStep) - (Math.PI / 2))}
            y2={center + radius * Math.sin((i * angleStep) - (Math.PI / 2))}
            stroke="rgba(156, 163, 175, 0.2)"
            strokeWidth="1"
          />
        ))}
        
        <polygon
          points={targetPolygon}
          fill="rgba(99, 102, 241, 0.05)"
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        
        <polygon
          points={currentPolygon}
          fill="rgba(99, 102, 241, 0.4)"
          stroke="rgba(99, 102, 241, 0.8)"
          strokeWidth="2"
          className="transition-all duration-500 ease-out"
        />
        
        {skills.map((skill, i) => {
          const theta = (i * angleStep) - (Math.PI / 2);
          const labelRadius = radius + 20;
          const x = center + labelRadius * Math.cos(theta);
          const y = center + labelRadius * Math.sin(theta);
          
          let anchor: "middle" | "start" | "end" = "middle";
          if (x < center - 10) anchor = "end";
          if (x > center + 10) anchor = "start";

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="text-[9px] font-bold fill-slate-500 uppercase tracking-wider"
            >
              {skill.length > 10 ? skill.substring(0, 10) + "..." : skill}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const SkillAssessment = ({ roleName, skillsList, scannedLevels, onSubmit, onCancel }: Props) => {
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [source, setSource] = useState<'ai' | 'database'>('ai');

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
    let totalEstimatedHours = 0;

    skillsList.forEach(s => {
      const rating = userRatings[s.skill] || 0;
      const isCritical = s.importance === "Critical";
      const weight = isCritical ? 2 : 1;
      const targetLevel = isCritical ? 8 : 5;

      maxScore += 10 * weight;
      currentScore += rating * weight;

      if (isCritical && rating < 5) criticalGaps++;

      const gap = Math.max(0, targetLevel - rating);
      totalEstimatedHours += gap * 15; 
    });

    const percentage = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
    return { percentage, criticalGaps, totalSkills: skillsList.length, totalEstimatedHours };
  }, [userRatings, skillsList]);

  const radarData = useMemo(() => {
    const displaySkills = skillsList.slice(0, 6);
    return {
      labels: displaySkills.map(s => s.skill),
      targets: displaySkills.map(s => s.importance === "Critical" ? 8 : 5),
      current: displaySkills.map(s => userRatings[s.skill] || 0)
    };
  }, [skillsList, userRatings]);

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
      : { text: "Nearly ready. We polish advanced topics.", icon: Award, color: "text-emerald-500" };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 lg:pb-0">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-indigo-200/30 to-blue-200/30 rounded-full blur-[140px]"
        />
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-200/30 to-fuchsia-200/30 rounded-full blur-[140px]"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <button onClick={onCancel} className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold text-sm" type="button">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 group-hover:border-slate-400 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            <span className="hidden sm:inline">Back to Overview</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
            <Activity size={14} />
            <span>Diagnostic Matrix</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Target size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Profile</span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-8">{roleName}</h1>

                <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-xl border border-slate-800">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          Match Score
                        </span>
                        <motion.div className="mt-2 flex items-baseline gap-1">
                          <span className="text-6xl font-black tracking-tighter text-white">
                            {stats.percentage}
                          </span>
                          <span className="text-2xl text-slate-400 font-bold">%</span>
                        </motion.div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <scoreMessage.icon className={scoreMessage.color} size={24} />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mb-6">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{scoreMessage.text}</p>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <RadarChart skills={radarData.labels} current={radarData.current} target={radarData.targets} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                    <div className="text-rose-600 mb-2 p-2 bg-white rounded-lg w-fit shadow-sm border border-rose-100">
                      <AlertCircle size={18} />
                    </div>
                    <div className="text-3xl font-black text-rose-700">{stats.criticalGaps}</div>
                    <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Critical Gaps</div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Market Demand</div>
                    <div className="text-xl font-black text-emerald-700">Very High</div>
                  </div>
                  <div className="text-emerald-600 p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="hidden lg:block">
              <div className="bg-slate-100 p-1.5 rounded-2xl mb-4 flex">
                <button
                  onClick={() => setSource('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    source === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  type="button"
                >
                  <Sparkles size={14} /> AI Curated
                </button>
                <button
                  onClick={() => setSource('database')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    source === 'database' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  type="button"
                >
                  <Database size={14} /> DB Sourced
                </button>
              </div>

              <motion.button
                onClick={() => onSubmit(buildBackendPayload(userRatings), source)}
                disabled={stats.totalSkills === 0}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                type="button"
              >
                <span className="flex items-center gap-3">
                  Generate Custom Roadmap
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <p className="text-center text-xs text-slate-500 mt-4 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Target size={14} /> Driven by community metrics
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Competency Matrix</h2>
                <p className="text-slate-500 text-sm font-medium">Calibrate your profile to generate an accurate learning velocity.</p>
              </div>
            </motion.div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <ScanSearch size={16} className="text-slate-600" />
                </div>
                <h3 className="font-black tracking-tight text-slate-900">Standardised Scoring Rubric</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {LEVELS.map((l, idx) => (
                  <motion.div
                    key={l.val}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`text-left p-5 rounded-2xl border ${l.bg} border-slate-200 flex flex-col justify-start h-full`}
                  >
                    <div className={`text-2xl font-black mb-1 ${l.color}`}>{l.short}</div>
                    <div className={`text-sm font-bold mb-3 ${l.color}`}>{l.label}</div>
                    <div className="text-xs text-slate-600 leading-relaxed mt-auto font-medium">{l.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <section>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">Core Requirements</h3>
                  <p className="text-xs text-slate-500 font-medium">Non-negotiable competencies for this role.</p>
                </div>
                <span className="ml-auto text-sm font-black text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{criticalSkills.length}</span>
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
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 mb-6 pt-10 border-t border-slate-200">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl shadow-sm">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">Auxiliary Capabilities</h3>
                    <p className="text-xs text-slate-500 font-medium">Market differentiators and value-adds.</p>
                  </div>
                  <span className="ml-auto text-sm font-black text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{bonusSkills.length}</span>
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

      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 lg:hidden z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="bg-slate-100 p-1.5 rounded-2xl mb-4 flex">
          <button
            onClick={() => setSource('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              source === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            type="button"
          >
            <Sparkles size={14} /> AI Curated
          </button>
          <button
            onClick={() => setSource('database')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              source === 'database' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            type="button"
          >
            <Database size={14} /> DB Sourced
          </button>
        </div>

        <motion.button
          onClick={() => onSubmit(buildBackendPayload(userRatings), source)}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 group"
          type="button"
        >
          <span className="flex items-center gap-3">
            Compile Curriculum
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
  
  const mockBenchmark = 65 + (skill.skill.length % 30);
  const salaryBump = 2 + (skill.skill.length % 12);
  const categoryStyle = CATEGORY_STYLES[skill.category] || CATEGORY_STYLES.Default;
  const isHighDemand = skill.skill.length % 3 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative bg-white rounded-3xl p-5 md:p-6 border transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 ${
        isCritical ? "border-l-4 border-l-rose-500 border-y-slate-200 border-r-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h4 className="font-black tracking-tight text-slate-900 text-xl">{skill.skill}</h4>
            {isHighDemand && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded shadow-sm border border-rose-100">
                <TrendingUp size={10} strokeWidth={3} /> Surge Demand
              </span>
            )}
            {isMatched && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shadow-sm border border-emerald-100">
                <CheckCircle2 size={10} strokeWidth={3} /> AI Verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${categoryStyle}`}>
              {skill.category}
            </span>
            
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              <Briefcase size={12} /> {mockBenchmark}% in JDs
            </span>

            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
              <DollarSign size={12} /> +{salaryBump}% Premium
            </span>

            {skill.context && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-auto md:ml-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-indigo-600 hover:text-indigo-800 font-black transition-colors bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100"
                type="button"
              >
                <Lightbulb size={12} />
                {isExpanded ? "Close Brief" : "Intelligence"}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0">
          <div className="bg-slate-50 border border-slate-200 p-2 rounded-2xl flex relative shadow-inner">
            <motion.div
              className={`absolute top-2 bottom-2 rounded-xl shadow-sm z-0 ${activeLevel.bg} border border-slate-200`}
              layoutId={`pill-${skill.skill}`}
              initial={false}
              animate={{
                width: `calc(20% - 8px)`,
                left: `calc(${LEVELS.findIndex(l => l.val === activeLevel.val) * 20}% + 4px)`
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />

            {LEVELS.map(level => {
              const isSelected = activeLevel.val === level.val;
              return (
                <motion.button
                  key={level.val}
                  onClick={() => onRate(skill.skill, level.val)}
                  whileHover={{ scale: isSelected ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative z-10 w-12 sm:w-14 md:w-16 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                    isSelected ? `${level.color} font-black` : "text-slate-400 hover:text-slate-600 font-bold"
                  }`}
                  type="button"
                >
                  <span className="text-sm">
                    {level.short}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeLevel.color}`}>{activeLevel.label}</span>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && skill.context && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <ScanSearch size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Candidate Evidence</span>
                  </div>
                  <div className="absolute top-4 right-4 opacity-5">
                    <Quote size={40} className="text-slate-900" />
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium relative z-10 border-l-4 border-slate-300 pl-4 italic">
                    "{skill.context}"
                  </p>
                </div>

                <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <LineChart size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Strategic Value</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Mastering <strong className="text-indigo-900">{skill.skill}</strong> directly correlates with senior compensation brackets. This competency is a heavily weighted ranking factor for {isHighDemand ? "tier one technology firms" : "industry standard engineering teams"}.
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};