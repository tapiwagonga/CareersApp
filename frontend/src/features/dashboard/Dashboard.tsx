import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";

import {
  Play,
  BookOpen,
  Mic,
  Layout,
  Zap,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Trophy,
  Lock,
  MapPin,
  Check,
  Star,
  Flame,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Maximize2,
  Flag,
  Timer,
  Home,
  Terminal,
  Github,
  Loader2,
  Menu,
  X,
  Briefcase,
  UserCheck
} from "lucide-react";

import { AnalysisResult, RoadmapTask, RoadmapPhase } from "../../types";
import { ResourcePlayer } from "./ResourcePlayer";
import { roadmapService } from "../../services/roadmapService";
import { Mermaid } from "../../components/Mermaid";
import { SkillQuiz } from "./SkillQuiz";
import { api, endpoints } from "../../services/api";
import { getPhaseStatus } from "../../utils/timeline";
import { RoadmapSearch } from "./RoadmapSearch";

type ResumeMeta = {
  roadmapId?: string;
  createdAt?: string;
  phaseIndex?: number;
  taskKey?: string | null;
  roleTitle?: string;
};

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

const normaliseTaskType = (t: any) => (t?.type ?? "doc").toString();

const isTaskDone = (t: any) => t?.status === "Completed" || t?.status === "Done" || Boolean(t?.is_completed);

const makeTaskKey = (t: any, idx: number) => {
  const id = t?.id ?? t?._id ?? null;
  if (id !== null && id !== undefined) return `id:${String(id)}`;
  const title = (t?.title ?? "").toString().trim().toLowerCase();
  const type = normaliseTaskType(t);
  return `fallback:${type}:${title}:${idx}`;
};

const formatUKShort = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const TYPE_ICONS: Record<string, any> = {
  video: Play,
  audio: Mic,
  article: BookOpen,
  doc: BookOpen,
  course: Layout,
  project: Zap,
  boss_battle: ShieldAlert,
  Watch: Play,
  Read: BookOpen,
  Build: Zap,
  Practice: CheckCircle2
};

const TYPE_COLORS: Record<string, string> = {
  video: "bg-red-50 text-red-600 border-red-200",
  audio: "bg-purple-50 text-purple-600 border-purple-200",
  article: "bg-blue-50 text-blue-600 border-blue-200",
  doc: "bg-cyan-50 text-cyan-600 border-cyan-200",
  course: "bg-orange-50 text-orange-600 border-orange-200",
  project: "bg-emerald-50 text-emerald-600 border-emerald-200",
  boss_battle: "bg-gray-900 text-yellow-400 border-yellow-500",
  Watch: "bg-red-50 text-red-600 border-red-200",
  Read: "bg-blue-50 text-blue-600 border-blue-200",
  Build: "bg-emerald-50 text-emerald-600 border-emerald-200"
};

const VisualAid = ({ query }: { query: string }) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-6 group">
      <div className="bg-[#0F172A] rounded-xl overflow-hidden border border-indigo-500/30 shadow-xl relative">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}
        />
        <div className="relative z-10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/50 text-indigo-300">
              <ImageIcon size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Instructional Diagram</div>
              <div className="text-white font-bold text-lg leading-tight">{query}</div>
            </div>
          </div>
          <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors text-white">
            <Maximize2 size={18} />
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
      </div>
    </motion.div>
  );
};

const CelebrationOverlay = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1, y: -20 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
      >
        <div className="bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-gray-800">
          <div className="bg-yellow-400 text-black p-1.5 rounded-full">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-sm">XP Gained!</h3>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Progress Saved</p>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const VelocityWidget = ({ createdAt, progress, totalWeeks }: { createdAt: string; progress: number; totalWeeks: number }) => {
  const start = new Date(createdAt);
  const now = new Date();
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDaysEst = Math.max(7, totalWeeks * 7);
  const expectedProgress = Math.min(100, (daysElapsed / totalDaysEst) * 100);
  const diff = progress - expectedProgress;

  let status: any = {
    label: "On Track",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: TrendingUp
  };

  if (diff > 5) {
    status = {
      label: "Ahead of Schedule",
      color: "text-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
      icon: Flame
    };
  } else if (diff < -10) {
    status = {
      label: "Falling Behind",
      color: "text-rose-500",
      bg: "bg-rose-50",
      border: "border-rose-100",
      icon: AlertCircle
    };
  }

  return (
    <div className={`p-4 rounded-xl border ${status.bg} ${status.border}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-1.5 rounded-lg bg-white shadow-sm ${status.color}`}>
          <status.icon size={16} />
        </div>
        <div className={`text-xs font-black uppercase tracking-widest ${status.color}`}>{status.label}</div>
      </div>

      <div className="flex justify-between items-end text-xs font-medium text-gray-500 mt-2">
        <span>
          Day {daysElapsed} of {totalDaysEst}
        </span>
        <span className={status.color}>
          {diff > 0 ? "+" : ""}
          {Math.round(diff)}% pace
        </span>
      </div>

      <div className="relative h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-gray-300 opacity-50" style={{ width: `${expectedProgress}%` }} />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`absolute top-0 left-0 h-full ${diff < -10 ? "bg-rose-500" : diff > 5 ? "bg-amber-400" : "bg-emerald-500"}`}
        />
      </div>
    </div>
  );
};

const RoadmapPath = ({
  phases,
  activePhaseId,
  onPhaseSelect
}: {
  phases: RoadmapPhase[];
  activePhaseId: number;
  onPhaseSelect: (idx: number) => void;
}) => {
  const avatarConfig = useMemo(() => genConfig(), []);

  return (
    <div className="relative py-10 px-4">
      <div className="absolute left-[38px] top-0 bottom-0 w-1 bg-gray-100 rounded-full" />
      <div className="space-y-8 relative z-10">
        {phases.map((phase, index) => {
          const phaseNum = index + 1;
          const isActive = phaseNum === activePhaseId;
          const isPast = phaseNum < activePhaseId;
          const isLocked = phaseNum > activePhaseId;

          return (
            <div key={(phase as any).week_number || index} className="relative pl-16 group">
              <button
                type="button"
                onClick={() => {
                  if (!isLocked) onPhaseSelect(phaseNum);
                }}
                disabled={isLocked}
                className={`absolute left-5 -translate-x-1/2 w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-20 ${
                  isActive ? "bg-black border-black scale-110 shadow-xl" : isPast ? "bg-green-500 border-green-500" : "bg-white border-gray-200"
                }`}
              >
                {isPast ? (
                  <Check className="text-white" size={16} strokeWidth={3} />
                ) : isActive ? (
                  <MapPin className="text-white" size={16} />
                ) : isLocked ? (
                  <Lock className="text-gray-300" size={14} />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </button>

              {isActive && (
                <motion.div
                  layoutId="avatar-walker"
                  className="absolute left-5 -translate-x-1/2 -top-12 z-30 filter drop-shadow-md"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-white overflow-hidden">
                    <ReactNiceAvatar style={{ width: "100%", height: "100%" }} {...avatarConfig} />
                  </div>
                </motion.div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!isLocked) onPhaseSelect(phaseNum);
                }}
                disabled={isLocked}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? "bg-white border-black shadow-md translate-x-1"
                    : isLocked
                      ? "bg-transparent border-transparent opacity-50 cursor-not-allowed"
                      : "bg-white border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isActive ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                    {(phase as any).label?.split(" ")[0] || `Phase ${phaseNum}`}
                  </span>
                  {isPast && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <h3 className={`font-bold text-sm leading-tight ${isActive ? "text-gray-900" : "text-gray-500"}`}>{(phase as any).focus_area}</h3>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BossBattleCard = ({
  task,
  isCompleted,
  onToggle
}: {
  task: RoadmapTask;
  isCompleted: boolean;
  onToggle: (rating?: number, metaPatch?: Record<string, any>) => void;
}) => {
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const parts = (task.description || "").split(/Requirements:|Objectives:/i);
  const brief = parts[0] || "";
  const requirements = parts[1] ? parts[1].split(/[-•]\s/).filter(s => s.trim().length > 0) : [];

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!link.trim()) return;

    setSubmitting(true);

    try {
      const payload = {
        task_title: task.title,
        requirements: requirements.join(". "),
        user_input: link
      };

      const { data } = await api.post(endpoints.gradeProject, payload);

      if (data?.passed) {
        alert(`✅ Passed! Feedback: ${data.feedback ?? ""}`);
        onToggle(undefined, { submission_link: link, grader_feedback: data.feedback, passed: true });
      } else {
        alert(`❌ Submission Rejected. Feedback: ${data?.feedback ?? "No feedback returned"}`);
        onToggle(undefined, { submission_link: link, grader_feedback: data?.feedback, passed: false });
      }
    } catch (err) {
      console.error("Grading failed, falling back to simulation", err);
      await new Promise(r => setTimeout(r, 1200));
      onToggle(undefined, { submission_link: link, passed: true, grader_feedback: "Offline simulation pass" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full rounded-2xl border-2 transition-all overflow-hidden ${
        isCompleted ? "bg-gray-900 border-gray-800 opacity-70" : "bg-[#0F172A] border-indigo-500/30 shadow-lg hover:border-indigo-500/50"
      }`}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="h-8 bg-black/40 border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-400 opacity-70">
          <Terminal size={10} />
          <span>mission_brief.md</span>
        </div>
        <div />
      </div>

      <div className="p-6 md:p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${isCompleted ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"}`}>
              {isCompleted ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xl font-bold text-white tracking-tight">{(task.title || "").replace(/Build:|Project:/i, "").trim()}</h4>
                {isCompleted && (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-wider font-bold">
                    Solved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  <Zap size={12} className="text-yellow-500" /> {task.xp_reward || 100} XP
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {task.estimated_minutes || 60}m est
                </span>
              </div>
            </div>
          </div>

          <button type="button" className={`p-2 rounded-full hover:bg-white/5 transition-colors text-gray-500 ${expanded ? "rotate-90" : ""}`}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Directive</div>
            <p className="text-gray-300 text-sm leading-relaxed">{brief}</p>
          </div>

          <AnimatePresence>
            {expanded && requirements.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-4 border-t border-white/5">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Acceptance Criteria</div>
                  <div className="grid gap-2">
                    {requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5 text-sm text-gray-400 font-mono">
                        <span className="text-indigo-500 mt-0.5">0{i + 1}.</span>
                        {req.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCompleted && (
            <div onClick={e => e.stopPropagation()} className="mt-6 pt-6 border-t border-white/10">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Submit Solution</label>
              <div className="flex gap-2">
                <div className="flex-1 relative group">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Paste your GitHub repository or Replit link..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-600 font-mono"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="button"
                  disabled={!link || submitting}
                  onClick={handleSubmit}
                  className="px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : "Submit"}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggle(undefined, { submission_link: link || undefined });
              }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
            >
              {isCompleted ? "Mark as Not Done" : "Mark as Done"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MissionCard = ({
  task,
  isCompleted,
  onOpen,
  onToggle
}: {
  task: RoadmapTask;
  isCompleted: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) => {
  const type = normaliseTaskType(task);
  const isProject = type === "boss_battle" || type === "project" || type === "Build";

  if (isProject) {
    return (
      <BossBattleCard
        task={task}
        isCompleted={isCompleted}
        onToggle={(rating?: number, metaPatch?: Record<string, any>) => {
          onToggle();
          void rating;
          void metaPatch;
        }}
      />
    );
  }

  const Icon = TYPE_ICONS[type] || TYPE_ICONS.doc;
  const colorClass = TYPE_COLORS[type] || TYPE_COLORS.doc;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full p-5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
        isCompleted ? "bg-gray-50 border-gray-100 opacity-70 grayscale" : "bg-white border-gray-100 hover:border-black hover:shadow-lg"
      }`}
      onClick={onOpen}
      data-task-card
    >
      <div className="flex gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${colorClass}`}>
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-900 truncate pr-8">{task.title}</h4>
            <span className="text-xs font-bold text-yellow-500 flex items-center gap-1 shrink-0">
              <Zap size={10} fill="currentColor" /> +{task.xp_reward || 50}
            </span>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-3">{task.description}</p>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {task.estimated_minutes || 30} min
            </span>
            {(task as any)?.meta?.platform && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">{(task as any).meta.platform}</span>
            )}
            <span className="text-blue-600 font-bold flex items-center gap-1">
              Open <Play size={10} />
            </span>
          </div>
        </div>

        <button
          type="button"
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            isCompleted ? "bg-green-500 border-green-500" : "border-gray-200 group-hover:border-black"
          }`}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isCompleted && <CheckCircle2 size={14} className="text-white" />}
        </button>
      </div>
    </motion.div>
  );
};

interface DashboardProps {
  data: AnalysisResult;
  userId?: string;
  createdAt?: string;
  onReset: () => void;
  onExit: () => void;
  onStartInterview?: () => void;
  onUpdate?: (updatedData: AnalysisResult) => void;
}

export const Dashboard = ({ data, userId, createdAt, onReset, onExit, onStartInterview, onUpdate }: DashboardProps) => {
  const [localData, setLocalData] = useState<AnalysisResult>(data);
  const [activePhaseIndex, setActivePhaseIndex] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeResource, setActiveResource] = useState<RoadmapTask | null>(null);
  const [quizSkill, setQuizSkill] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const resumeMeta = useMemo(() => ((data as any)?._resume as ResumeMeta | undefined) ?? undefined, [data]);

  const lastOpenRef = useRef<{ phaseIndex: number; taskKey: string | null }>({ phaseIndex: 1, taskKey: null });
  const saveTimerRef = useRef<number | null>(null);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (data) setLocalData(data);
  }, [data]);

  const phases = useMemo(() => safeArray<RoadmapPhase>((localData as any)?.roadmap), [localData]);

  const roleTitle = useMemo(() => ((localData as any)?.role_name || (resumeMeta?.roleTitle ?? "Role")).toString(), [localData, resumeMeta]);

  const createdAtResolved = useMemo(() => createdAt || resumeMeta?.createdAt || new Date().toISOString(), [createdAt, resumeMeta]);

  useEffect(() => {
    if (!resumeMeta) return;

    const p = resumeMeta.phaseIndex && resumeMeta.phaseIndex > 0 ? resumeMeta.phaseIndex : 1;
    const max = phases.length || 1;
    const clamped = Math.min(max, Math.max(1, p));

    setActivePhaseIndex(clamped);
    lastOpenRef.current = { phaseIndex: clamped, taskKey: resumeMeta.taskKey ?? null };
  }, [resumeMeta, phases.length]);

  const stats = useMemo(() => {
    let totalXP = 0;
    let currentXP = 0;

    phases.forEach(phase => {
      safeArray<RoadmapTask>((phase as any)?.tasks).forEach(t => {
        const xp = (t as any)?.xp_reward || 50;
        totalXP += xp;
        if (isTaskDone(t)) currentXP += xp;
      });
    });

    const progress = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0;
    return { totalXP, currentXP, progress };
  }, [phases]);

  const activePhase = useMemo(() => {
    const phase = phases[activePhaseIndex - 1];
    if (!phase) return null;
    return { ...(phase as any), tasks: safeArray<RoadmapTask>((phase as any).tasks) } as RoadmapPhase & { tasks: RoadmapTask[] };
  }, [phases, activePhaseIndex]);

  const searchItems = useMemo(() => {
    const allPhases = safeArray<any>((localData as any)?.roadmap);

    return allPhases.flatMap((phase: any, pIdx: number) => {
      const label = phase?.label || phase?.focus_area || `Phase ${pIdx + 1}`;
      const tasks = safeArray<any>(phase?.tasks);

      return tasks.map((t: any, tIdx: number) => ({
        label,
        phaseIndex: pIdx + 1,
        taskKey: makeTaskKey(t, tIdx),
        taskTitle: (t?.title || "").toString(),
        taskType: (t?.type || "").toString(),
        isDone: isTaskDone(t)
      }));
    });
  }, [localData]);

  const renderDescription = (text: string) => {
    if (!text) return null;
    const mermaidRegex = /```mermaid([\s\S]*?)```/g;
    const parts = text.split(mermaidRegex);

    return (
      <div className="text-lg text-gray-500 max-w-2xl leading-relaxed space-y-4">
        {parts.map((part, i) => {
          if (i % 2 === 1) return <Mermaid key={i} chart={part.trim()} />;

          return (
            <span key={i} className="whitespace-pre-wrap block">
              {part.split(/(<visual_aid>.*?<\/visual_aid>)/g).map((subPart, j) => {
                const match = subPart.match(/<visual_aid>(.*?)<\/visual_aid>/);
                if (match) return <VisualAid key={`${i}-${j}`} query={match[1]} />;
                return <span key={j}>{subPart}</span>;
              })}
            </span>
          );
        })}
      </div>
    );
  };

  const scheduleSave = useCallback(
    (nextData: AnalysisResult, pointer?: { phaseIndex?: number; taskKey?: string | null }) => {
      if (!userId) return;

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      saveTimerRef.current = window.setTimeout(() => {
        const doSave = async () => {
          try {
            await roadmapService.saveRoadmap(userId, roleTitle, nextData, {
              phaseIndex: pointer?.phaseIndex ?? lastOpenRef.current.phaseIndex,
              taskKey: pointer?.taskKey ?? lastOpenRef.current.taskKey
            });
          } catch (e) {
            console.error("saveRoadmap failed", e);
          }
        };

        inFlightSaveRef.current = doSave();
      }, 400);
    },
    [userId, roleTitle]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistResumePointer = useCallback(
    async (phaseIndex: number, taskKey: string | null) => {
      lastOpenRef.current = { phaseIndex, taskKey };

      if (!userId) return;
      try {
        await roadmapService.updateResume(userId, roleTitle, phaseIndex, taskKey);
      } catch (e) {
        console.error("updateResume failed", e);
      }
    },
    [userId, roleTitle]
  );

  const patchTask = useCallback(
    (phaseIdx: number, taskKey: string, updater: (task: any) => void) => {
      setLocalData(prev => {
        const next = (typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev))) as any;
        const phase = next?.roadmap?.[phaseIdx];
        const tasks = safeArray<any>(phase?.tasks);

        let hit = false;

        const updatedTasks = tasks.map((t: any, idx: number) => {
          const key = makeTaskKey(t, idx);
          if (key !== taskKey) return t;
          const copy = { ...t };
          updater(copy);
          hit = true;
          return copy;
        });

        if (!hit) return prev;

        next.roadmap[phaseIdx] = { ...phase, tasks: updatedTasks };
        if (onUpdate) onUpdate(next);
        scheduleSave(next);
        return next;
      });
    },
    [onUpdate, scheduleSave]
  );

  const handleTaskToggleComplete = useCallback(
    async (phaseIdx: number, taskKey: string, rating?: number, metaPatch?: Record<string, any>) => {
      patchTask(phaseIdx, taskKey, (task: any) => {
        const done = isTaskDone(task);

        if (done) {
          task.status = "Pending";
          task.is_completed = false;
          if (task.meta) {
            const meta = { ...task.meta };
            delete meta.user_rating;
            task.meta = meta;
          }
        } else {
          task.status = "Completed";
          task.is_completed = true;

          if (rating !== undefined && rating !== null) {
            task.meta = { ...(task.meta || {}), user_rating: rating };
          }

          if (metaPatch && typeof metaPatch === "object") {
            task.meta = { ...(task.meta || {}), ...metaPatch };
          }

          setShowCelebration(true);
          window.setTimeout(() => setShowCelebration(false), 2500);
        }
      });
    },
    [patchTask]
  );

  const openTask = useCallback(
    async (phaseIdx: number, taskKey: string) => {
      const phase = phases[phaseIdx];
      const tasks = safeArray<any>((phase as any)?.tasks);

      const task = tasks.find((t: any, idx: number) => makeTaskKey(t, idx) === taskKey);
      if (!task) return;

      setActivePhaseIndex(phaseIdx + 1);
      setActiveResource(task as any);

      await persistResumePointer(phaseIdx + 1, taskKey);
      scheduleSave(localData, { phaseIndex: phaseIdx + 1, taskKey });
    },
    [phases, persistResumePointer, scheduleSave, localData]
  );

  const finishResource = useCallback(
    (rating?: number) => {
      if (!activePhase || !activeResource) {
        setActiveResource(null);
        return;
      }

      const phaseIdx = activePhaseIndex - 1;
      const tasks = safeArray<any>((localData as any)?.roadmap?.[phaseIdx]?.tasks);

      const taskIdx = tasks.findIndex((t: any, idx: number) => {
        const k = makeTaskKey(t, idx);
        const activeK = makeTaskKey(activeResource as any, 0);
        return k === activeK || t?.id === (activeResource as any)?.id;
      });

      if (taskIdx >= 0) {
        const taskKey = makeTaskKey(tasks[taskIdx], taskIdx);
        void handleTaskToggleComplete(phaseIdx, taskKey, rating);
        void persistResumePointer(activePhaseIndex, taskKey);
        scheduleSave(localData, { phaseIndex: activePhaseIndex, taskKey });
      }

      setActiveResource(null);
    },
    [activePhase, activeResource, activePhaseIndex, localData, handleTaskToggleComplete, persistResumePointer, scheduleSave]
  );

  const handleQuizPass = useCallback(() => {
    setQuizSkill(null);
    setShowCelebration(true);
    window.setTimeout(() => setShowCelebration(false), 2500);

    setActivePhaseIndex(prev => {
      const max = phases.length;
      const next = prev < max ? prev + 1 : prev;
      void persistResumePointer(next, null);
      scheduleSave(localData, { phaseIndex: next, taskKey: null });
      return next;
    });
  }, [phases.length, persistResumePointer, scheduleSave, localData]);

  const findNextIncomplete = useCallback(() => {
    const startPhase = Math.max(1, lastOpenRef.current.phaseIndex || activePhaseIndex);
    const startPhaseIdx = startPhase - 1;

    for (let p = startPhaseIdx; p < phases.length; p += 1) {
      const tasks = safeArray<any>((phases[p] as any)?.tasks);
      if (!tasks.length) continue;

      let startTaskIdx = 0;
      if (p === startPhaseIdx && lastOpenRef.current.taskKey) {
        const idx = tasks.findIndex((t: any, i: number) => makeTaskKey(t, i) === lastOpenRef.current.taskKey);
        if (idx >= 0) startTaskIdx = idx;
      }

      for (let t = startTaskIdx; t < tasks.length; t += 1) {
        if (!isTaskDone(tasks[t])) {
          const taskKey = makeTaskKey(tasks[t], t);
          return { phaseIdx: p, taskKey };
        }
      }

      for (let t = 0; t < startTaskIdx; t += 1) {
        if (!isTaskDone(tasks[t])) {
          const taskKey = makeTaskKey(tasks[t], t);
          return { phaseIdx: p, taskKey };
        }
      }
    }

    return null;
  }, [phases, activePhaseIndex]);

  const handleContinue = useCallback(() => {
    const next = findNextIncomplete();
    if (!next) return;
    void openTask(next.phaseIdx, next.taskKey);
  }, [findNextIncomplete, openTask]);

  useEffect(() => {
    if (!resumeMeta?.taskKey) return;

    const phaseIdx = (resumeMeta.phaseIndex || 1) - 1;
    if (phaseIdx < 0 || phaseIdx >= phases.length) return;

    const tasks = safeArray<any>((phases[phaseIdx] as any)?.tasks);
    const exists = tasks.some((t: any, i: number) => makeTaskKey(t, i) === resumeMeta.taskKey);

    if (exists) {
      void openTask(phaseIdx, resumeMeta.taskKey);
    }
  }, [resumeMeta, phases, openTask]);

  const jumpToTask = useCallback(
    async (phaseIndex: number, taskKey: string) => {
      const phaseIdx = phaseIndex - 1;
      await openTask(phaseIdx, taskKey);
    },
    [openTask]
  );

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-100 bg-white">
        <h2 className="text-xl font-black text-gray-900 mb-1 tracking-tight">Your Journey</h2>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest truncate mb-6">{roleTitle}</p>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full mb-5 bg-black text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <Play size={14} /> Continue
        </button>

        <div className="mb-6 bg-black text-white p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex justify-between items-end relative z-10">
            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Level {1 + Math.floor(stats.currentXP / 1000)}</div>
              <div className="font-mono text-2xl font-bold leading-none">{stats.currentXP} XP</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Progress</div>
              <div className="text-sm font-bold text-green-400">{stats.progress}%</div>
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.progress}%` }} className="h-full bg-green-400 transition-all duration-1000 ease-out" />
          </div>
        </div>

        <VelocityWidget createdAt={createdAtResolved} progress={stats.progress} totalWeeks={phases.length} />

        <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 font-medium px-1">
          <span className="flex items-center gap-1">
            <Flag size={10} /> Started {formatUKShort(createdAtResolved)}
          </span>
          <span>{phases.length} Modules</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/30">
        <RoadmapPath
          phases={phases as any}
          activePhaseId={activePhaseIndex}
          onPhaseSelect={idx => {
            setActivePhaseIndex(idx);
            setIsMobileMenuOpen(false);
            void persistResumePointer(idx, null);
            scheduleSave(localData, { phaseIndex: idx, taskKey: null });
          }}
        />
      </div>

      <div className="p-4 border-t border-gray-100 bg-white space-y-2">
        <button
          type="button"
          onClick={onExit}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <Home size={14} /> Back to Home
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest py-2"
        >
          Archive and Start New
        </button>
      </div>
    </>
  );

  if (!activePhase) return null;

  const allTasksDone = activePhase.tasks.length > 0 && activePhase.tasks.every(t => isTaskDone(t));

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#F8F9FB] font-sans overflow-hidden relative">
      <CelebrationOverlay show={showCelebration} />

      <ResourcePlayer task={activeResource} onClose={() => setActiveResource(null)} onComplete={finishResource} />

      <AnimatePresence>{quizSkill && <SkillQuiz skill={quizSkill} onClose={() => setQuizSkill(null)} onPass={handleQuizPass} />}</AnimatePresence>

      <aside className="hidden md:flex w-[350px] h-full bg-white border-r border-gray-200 flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-white z-50 shadow-2xl overflow-y-auto flex flex-col md:hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg">Menu</h3>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex flex-col h-full">
                <SidebarContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 h-full overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] scroll-smooth">
        <div className="max-w-4xl mx-auto p-6 md:p-12 pb-24">
          <div className="mb-6">
            <RoadmapSearch
              items={searchItems}
              onSelect={item => {
                void jumpToTask(item.phaseIndex, item.taskKey);
              }}
            />
          </div>

          <motion.div key={(activePhase as any)?.label || activePhaseIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center justify-between mb-6 md:hidden">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Phase {activePhaseIndex} of {phases.length}
              </span>
              <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm text-gray-700">
                <Menu size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
                <Calendar size={12} />
                {(activePhase as any).start_date ? formatUKShort((activePhase as any).start_date) : "Start"} to{" "}
                {(activePhase as any).end_date ? formatUKShort((activePhase as any).end_date) : "End"}
              </div>

              <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-400 flex items-center gap-2">
                <Timer size={12} /> Est {(activePhase as any).total_hours || 0} Hours
              </div>

              {(() => {
                const status = getPhaseStatus((activePhase as any).end_date, (activePhase as any).is_completed);
                return (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-transparent ${status.bg} ${status.color} ${status.urgent ? "animate-pulse" : ""}`}>
                    <AlertCircle size={12} /> {status.label}
                  </div>
                );
              })()}
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">{(activePhase as any).focus_area}</h1>

            {renderDescription(((activePhase as any).description || "").toString())}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-colors"
              >
                <Play size={14} /> Continue
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {safeArray<any>(activePhase.tasks).map((task: any, tIdx: number) => {
                const done = isTaskDone(task);
                const taskKey = makeTaskKey(task, tIdx);
                const phaseIdx = activePhaseIndex - 1;

                return (
                  <div key={taskKey} data-task-key={taskKey}>
                    <MissionCard
                      task={task}
                      isCompleted={done}
                      onOpen={() => void openTask(phaseIdx, taskKey)}
                      onToggle={() => void handleTaskToggleComplete(phaseIdx, taskKey)}
                    />
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          {allTasksDone && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-12 bg-black text-white p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-gray-900 to-black z-0" />
              <div className="relative z-10">
                {activePhaseIndex === phases.length ? (
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-500/30">
                      <Briefcase size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-3xl font-black mb-3">Roadmap Conquered.</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                      You have mastered the curriculum. There is only one thing left to do.
                      <br />
                      <span className="text-white font-bold">Prove your skills in the Bar Raiser Interview.</span>
                    </p>
                    <button
                      type="button"
                      onClick={onStartInterview}
                      className="bg-white text-black px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-3 mx-auto text-lg"
                    >
                      <UserCheck size={24} /> Begin The Final Interview
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-black mx-auto mb-4 shadow-lg rotate-3">
                      <Trophy size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Phase Tasks Complete!</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      To unlock the next module, verify your knowledge of <span className="text-white font-bold">{(activePhase as any).focus_area}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuizSkill(((activePhase as any).focus_area || "").toString())}
                      className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all hover:scale-105 flex items-center gap-3 mx-auto shadow-xl"
                    >
                      <ShieldAlert size={20} /> Verify and Unlock Phase {activePhaseIndex + 1}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};