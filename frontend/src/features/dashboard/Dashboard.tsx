import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Check,
  Star,
  ExternalLink,
  FileText,
  Home,
  Menu,
  X,
  Briefcase,
  UserCheck,
  Link as LinkIcon,
  PenTool,
  Flame,
  Activity,
  Code
} from "lucide-react";

import { AnalysisResult, RoadmapTask, RoadmapPhase } from "../../types";
import { ResourcePlayer } from "./ResourcePlayer";
import { roadmapService } from "../../services/roadmapService";
import { SkillQuiz } from "./SkillQuiz";

type ResumeMeta = {
  roadmapId?: string;
  createdAt?: string;
  phaseIndex?: number;
  taskKey?: string | null;
  roleTitle?: string;
};

type DocPreviewState = {
  url: string;
  title: string;
  provider?: string;
  iframeSafe: boolean;
};

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const normaliseTaskType = (t: any) => (t?.type ?? "doc").toString().trim().toLowerCase();
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
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const TYPE_ICONS: Record<string, any> = {
  video: Play, audio: Mic, article: BookOpen, doc: FileText,
  documentation: FileText, deep_dive: FileText, interactive: Layout,
  course: Layout, project: Zap, boss_battle: ShieldAlert, watch: Play,
  read: BookOpen, build: Zap, book: BookOpen
};

const TYPE_COLOURS: Record<string, string> = {
  video: "bg-rose-50 text-rose-600 border-rose-100",
  audio: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
  article: "bg-sky-50 text-sky-600 border-sky-100",
  doc: "bg-cyan-50 text-cyan-600 border-cyan-100",
  documentation: "bg-cyan-50 text-cyan-600 border-cyan-100",
  deep_dive: "bg-indigo-50 text-indigo-600 border-indigo-100",
  interactive: "bg-violet-50 text-violet-700 border-violet-100",
  course: "bg-orange-50 text-orange-600 border-orange-100",
  project: "bg-emerald-50 text-emerald-600 border-emerald-100",
  boss_battle: "bg-slate-900 text-amber-400 border-amber-500",
  book: "bg-amber-50 text-amber-600 border-amber-100"
};

const isInAppDocType = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  return ["doc", "documentation", "article", "deep_dive", "interactive", "read", "book"].includes(t);
};

const InlineDocViewer = ({ state, onClose }: { state: DocPreviewState | null; onClose: () => void }) => {
  if (!state) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full bg-white shadow-sm border border-slate-200 m-4 md:m-8 rounded-3xl overflow-hidden z-20"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onClose} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center">
            <ChevronRight className="rotate-180" size={18} />
          </button>
          <div>
            <div className="text-sm font-black text-slate-900 tracking-tight">{state.title}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              {state.provider || "External Resource"}
            </div>
          </div>
        </div>
        <a
          href={state.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <ExternalLink size={14} /> Open in Browser
        </a>
      </div>

      <div className="relative flex-1 bg-slate-100 w-full flex items-center justify-center">
        {!state.iframeSafe ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-10 max-w-md w-full text-center mx-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <ShieldAlert size={28} strokeWidth={2} />
            </div>
            <div className="font-black text-2xl text-slate-900 mb-3 tracking-tight">External Viewing Required</div>
            <div className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
              This publisher restricts direct embedding to protect your security. Please open the resource securely in a new browser tab.
            </div>
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black transition-all shadow-md"
            >
              <ExternalLink size={18} /> Access Material
            </a>
          </div>
        ) : (
          <iframe title={state.title} src={state.url} className="w-full h-full border-0 bg-white" />
        )}
      </div>
    </motion.div>
  );
};

const TaskCard = ({
  task,
  isCompleted,
  onOpen,
  onToggle
}: {
  task: RoadmapTask;
  isCompleted: boolean;
  onOpen: () => void;
  onToggle: (rating?: number) => void;
}) => {
  const [rating, setRating] = useState<number>(0);
  const [projectLink, setProjectLink] = useState("");
  const type = normaliseTaskType(task);
  const isProject = type === "boss_battle" || type === "project";
  
  const Icon = TYPE_ICONS[type] || FileText;
  const colourClass = TYPE_COLOURS[type] || "bg-slate-50 text-slate-600 border-slate-200";
  const meta = (task as any).meta || {};

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProject && !isCompleted && !projectLink.trim()) {
      alert("Please submit a link to your project repository.");
      return;
    }
    onToggle(rating > 0 ? rating : undefined);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full p-6 rounded-3xl border transition-all duration-300 ${
        isCompleted ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      }`}
      onClick={!isCompleted && !isProject ? onOpen : undefined}
    >
      <div className="flex flex-col md:flex-row gap-5 items-start relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${colourClass}`}>
          <Icon size={20} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex justify-between items-start mb-2 gap-4">
            <h4 className={`font-black text-lg tracking-tight leading-tight ${isCompleted ? "text-slate-500 line-through" : "text-slate-900"}`}>
              {task.title}
            </h4>
            {meta.quality_score && !isCompleted && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md text-[9px] font-black tracking-widest shrink-0">
                <Star size={10} fill="currentColor" /> {meta.quality_score} SCORE
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500 mb-4 leading-relaxed font-medium line-clamp-2">
            {task.description}
          </p>

          {!isCompleted && isProject && (
            <div className="mb-4 flex gap-3" onClick={e => e.stopPropagation()}>
              <div className="relative flex-1">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="url"
                  placeholder="Paste GitHub or project link here..."
                  value={projectLink}
                  onChange={e => setProjectLink(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-auto">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                <Clock size={12} /> {task.estimated_minutes || 30} MIN
              </span>
              <span className="hidden sm:block truncate max-w-[150px]">
                {meta.provider || "Curated"}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {!isCompleted && !isProject && (
                <button type="button" className="text-indigo-600 font-black text-sm hover:text-indigo-800 transition-colors flex items-center gap-2">
                  {isInAppDocType(type) ? "Read Material" : "Watch Video"} <ChevronRight size={16} />
                </button>
              )}

              {isCompleted ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 transition-colors ${rating >= star ? "text-amber-400" : "text-slate-200 hover:text-amber-200"}`}
                    >
                      <Star size={16} fill={rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                  <span className="text-[9px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Rate It</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md"
                >
                  <CheckCircle2 size={14} /> Mark Done
                </button>
              )}
            </div>
          </div>
        </div>
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
  const [activeResource, setActiveResource] = useState<RoadmapTask | null>(null);
  const [quizSkill, setQuizSkill] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocPreviewState | null>(null);
  
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [moduleNotes, setModuleNotes] = useState<Record<number, string>>({});
  const [streakDays, setStreakDays] = useState(1);

  const resumeMeta = useMemo(() => ((data as any)?._resume as ResumeMeta | undefined) ?? undefined, [data]);
  const phases = useMemo(() => safeArray<RoadmapPhase>((localData as any)?.roadmap), [localData]);
  const roleTitle = useMemo(() => ((localData as any)?.role_name || (resumeMeta?.roleTitle ?? "Role")).toString(), [localData, resumeMeta]);
  const createdAtResolved = useMemo(() => createdAt || resumeMeta?.createdAt || new Date().toISOString(), [createdAt, resumeMeta]);

  useEffect(() => {
    if (data) setLocalData(data);
  }, [data]);

  const stats = useMemo(() => {
    let totalXP = 0;
    let currentXP = 0;
    let totalRequiredHours = 0;
    let completedHours = 0;

    phases.forEach(phase => {
      safeArray<RoadmapTask>((phase as any)?.tasks).forEach(t => {
        const xp = (t as any)?.xp_reward || 50;
        const mins = (t as any)?.estimated_minutes || 30;
        totalXP += xp;
        totalRequiredHours += mins / 60;
        if (isTaskDone(t)) {
          currentXP += xp;
          completedHours += mins / 60;
        }
      });
    });

    const progress = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0;
    
    const startDate = new Date(createdAtResolved);
    const today = new Date();
    const daysElapsed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const velocityHoursPerDay = completedHours > 0 ? completedHours / daysElapsed : 0;
    const remainingHours = totalRequiredHours - completedHours;
    
    let projectedDaysRemaining = Math.ceil(remainingHours / (velocityHoursPerDay || 2)); 
    if (projectedDaysRemaining > 365) projectedDaysRemaining = 365;

    return { totalXP, currentXP, progress, velocityHoursPerDay, projectedDaysRemaining };
  }, [phases, createdAtResolved]);

  const activePhase = useMemo(() => {
    const phase = phases[activePhaseIndex - 1];
    if (!phase) return null;
    return { ...(phase as any), tasks: safeArray<RoadmapTask>((phase as any).tasks) } as RoadmapPhase & { tasks: RoadmapTask[] };
  }, [phases, activePhaseIndex]);

  const categorisedTasks = useMemo(() => {
    const tasks = activePhase?.tasks || [];
    return {
      theory: tasks.filter(t => ["doc", "documentation", "article", "book", "deep_dive", "read"].includes(normaliseTaskType(t))),
      media: tasks.filter(t => ["video", "audio", "watch"].includes(normaliseTaskType(t))),
      practical: tasks.filter(t => ["interactive", "project", "boss_battle", "course", "build", "practice"].includes(normaliseTaskType(t)))
    };
  }, [activePhase]);

  const persistSave = useCallback(async (nextData: AnalysisResult, previousData: AnalysisResult) => {
    if (onUpdate) onUpdate(nextData);
    if (!userId) return;
    
    try {
      await roadmapService.saveRoadmap(userId, roleTitle, nextData, { phaseIndex: activePhaseIndex });
    } catch (error) {
      console.error(error);
      alert("Network error: Failed to save your progress. Reverting changes.");
      setLocalData(previousData);
      if (onUpdate) onUpdate(previousData);
    }
  }, [userId, roleTitle, activePhaseIndex, onUpdate]);

  const handleTaskToggleComplete = useCallback((phaseIdx: number, taskKey: string, rating?: number) => {
    const previousData = JSON.parse(JSON.stringify(localData));
    const next = JSON.parse(JSON.stringify(localData));
    const phase = next.roadmap[phaseIdx];
    
    phase.tasks = phase.tasks.map((t: any, idx: number) => {
      if (makeTaskKey(t, idx) !== taskKey) return t;
      const done = isTaskDone(t);
      t.status = done ? "Pending" : "Completed";
      t.is_completed = !done;
      if (rating && !done) t.meta = { ...t.meta, user_rating: rating };
      return t;
    });
    
    setLocalData(next);
    persistSave(next, previousData);
  }, [localData, persistSave]);

  const openTask = useCallback((phaseIdx: number, taskKey: string) => {
    const phase = phases[phaseIdx];
    const task = safeArray<any>((phase as any)?.tasks).find((t: any, idx: number) => makeTaskKey(t, idx) === taskKey);
    if (!task) return;

    const type = normaliseTaskType(task);
    if (isInAppDocType(type)) {
      const url = task.meta?.url || "about:blank";
      setDocPreview({
        url,
        title: task.title || "Document",
        provider: task.meta?.provider,
        iframeSafe: task.meta?.iframe_safe !== false
      });
    } else {
      setActiveResource(task as any);
    }
  }, [phases]);

  const handleQuizPass = () => {
    setQuizSkill(null);
    setActivePhaseIndex(prev => Math.min(phases.length, prev + 1));
    setStreakDays(prev => prev + 1);
  };

  const handleNoteChange = (text: string) => {
    setModuleNotes(prev => ({ ...prev, [activePhaseIndex]: text }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-8 border-b border-slate-100 relative">
        <div className="absolute top-8 right-8 flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-black text-xs border border-rose-100 shadow-sm">
          <Flame size={14} fill="currentColor" /> {streakDays} Day Streak
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Curriculum</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">{roleTitle}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-end mb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Overall Progress</div>
              <div className="text-3xl font-black text-indigo-600 leading-none">{stats.progress}%</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {stats.currentXP} XP
            </div>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.progress}%` }} className="h-full bg-indigo-600" />
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-3 border-t border-slate-200/60">
            <Activity size={12} className="text-emerald-500" />
            Velocity: {stats.velocityHoursPerDay.toFixed(1)} hrs/day
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
          <Calendar size={18} className="text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Projected Completion</div>
            <div className="text-sm font-bold text-indigo-900 leading-snug">Based on current pace, you will finish in {stats.projectedDaysRemaining} days.</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
        {phases.map((phase, index) => {
          const phaseNum = index + 1;
          const isActive = phaseNum === activePhaseIndex;
          const isPast = phaseNum < activePhaseIndex;
          const isLocked = phaseNum > activePhaseIndex;

          return (
            <button
              key={index}
              onClick={() => !isLocked && setActivePhaseIndex(phaseNum)}
              disabled={isLocked}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                isActive ? "bg-white border-indigo-200 shadow-md" : isLocked ? "bg-transparent border-transparent opacity-50" : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isActive ? "bg-indigo-100 text-indigo-600" : isPast ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}>
                {isPast ? <Check size={14} strokeWidth={3} /> : isLocked ? <Lock size={12} /> : <span className="font-black text-xs">{phaseNum}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                  Module {phaseNum}
                </div>
                <div className={`font-bold text-sm truncate ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                  {(phase as any).focus_area}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-6 border-t border-slate-100 bg-white">
        <button onClick={onExit} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
          <Home size={16} /> Exit Learning
        </button>
      </div>
    </div>
  );

  if (!activePhase) return null;
  const allTasksDone = activePhase.tasks.length > 0 && activePhase.tasks.every(t => isTaskDone(t));

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#F8FAFC] font-sans overflow-hidden">
      <ResourcePlayer task={activeResource} onClose={() => setActiveResource(null)} onComplete={rating => {
        if (activeResource) {
          const tasks = safeArray<any>((localData as any)?.roadmap?.[activePhaseIndex - 1]?.tasks);
          const taskIdx = tasks.findIndex((t: any) => t.id === activeResource.id || t.title === activeResource.title);
          if (taskIdx >= 0) handleTaskToggleComplete(activePhaseIndex - 1, makeTaskKey(activeResource, taskIdx), rating);
        }
        setActiveResource(null);
      }} />

      <AnimatePresence>{quizSkill && <SkillQuiz skill={quizSkill} onClose={() => setQuizSkill(null)} onPass={handleQuizPass} />}</AnimatePresence>

      <aside className="hidden md:flex w-96 h-full shrink-0 z-20">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl flex flex-col md:hidden">
            <div className="flex justify-end p-4 border-b border-slate-100"><button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-lg"><X size={20} /></button></div>
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
        {docPreview ? (
          <InlineDocViewer state={docPreview} onClose={() => setDocPreview(null)} />
        ) : (
          <div className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
            <div className="flex items-center justify-between mb-8 md:hidden">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">Module {activePhaseIndex}</span>
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg border border-slate-200"><Menu size={20} /></button>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 relative">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{(activePhase as any).focus_area}</h1>
                <button 
                  onClick={() => setIsNotepadOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 transition-colors"
                >
                  <PenTool size={14} /> Developer Pad
                </button>
              </div>
              <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">{(activePhase as any).description}</p>
            </motion.div>

            <div className="space-y-12">
              
              {categorisedTasks.theory.length > 0 && (
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-500" /> Theory & Documentation
                  </h3>
                  <div className="space-y-4">
                    {categorisedTasks.theory.map((task: any) => {
                      const tIdx = activePhase.tasks.indexOf(task);
                      const taskKey = makeTaskKey(task, tIdx);
                      return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating)} />;
                    })}
                  </div>
                </section>
              )}

              {categorisedTasks.media.length > 0 && (
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 pt-6 border-t border-slate-200">
                    <Play size={16} className="text-rose-500" /> Media & Lectures
                  </h3>
                  <div className="space-y-4">
                    {categorisedTasks.media.map((task: any) => {
                      const tIdx = activePhase.tasks.indexOf(task);
                      const taskKey = makeTaskKey(task, tIdx);
                      return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating)} />;
                    })}
                  </div>
                </section>
              )}

              {categorisedTasks.practical.length > 0 && (
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2 pt-6 border-t border-slate-200">
                    <Code size={16} className="text-emerald-500" /> Practical Application
                  </h3>
                  <div className="space-y-4">
                    {categorisedTasks.practical.map((task: any) => {
                      const tIdx = activePhase.tasks.indexOf(task);
                      const taskKey = makeTaskKey(task, tIdx);
                      return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating)} />;
                    })}
                  </div>
                </section>
              )}

            </div>

            {allTasksDone && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-16 bg-white border border-slate-200 p-10 rounded-3xl text-center shadow-xl relative overflow-hidden">
                {activePhaseIndex === phases.length ? (
                  <>
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-6 relative z-10"><Briefcase size={32} /></div>
                    <h3 className="text-3xl font-black mb-4 text-slate-900 tracking-tight relative z-10">Curriculum Conquered</h3>
                    <p className="text-slate-500 mb-8 text-lg font-medium relative z-10">You have mastered the required skills. Prove your capability in the final technical screen.</p>
                    <button onClick={onStartInterview} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 mx-auto shadow-md shadow-indigo-600/20 relative z-10">
                      <UserCheck size={20} /> Begin The Bar Raiser
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6 relative z-10"><Trophy size={32} /></div>
                    <h3 className="text-2xl font-black mb-2 text-slate-900 relative z-10">Module Complete</h3>
                    <p className="text-slate-500 mb-8 font-medium relative z-10">Verify your knowledge to unlock the next module.</p>
                    <button onClick={() => setQuizSkill(((activePhase as any).focus_area || "").toString())} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-3 mx-auto shadow-md relative z-10">
                      <ShieldAlert size={18} /> Verify Knowledge
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isNotepadOpen && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 text-white">
                <PenTool size={20} className="text-indigo-400" />
                <h3 className="font-black text-lg tracking-tight">Developer Pad</h3>
              </div>
              <button onClick={() => setIsNotepadOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 shrink-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Context</div>
              <div className="text-sm font-bold text-indigo-300 truncate">{(activePhase as any).focus_area} Notes</div>
            </div>

            <div className="flex-1 p-6 relative">
              <textarea
                value={moduleNotes[activePhaseIndex] || ""}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Write Markdown notes, paste code snippets, or make calculations here..."
                className="w-full h-full bg-transparent text-slate-300 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder:text-slate-600"
                spellCheck={false}
              />
            </div>
            
            <div className="p-6 border-t border-slate-800 shrink-0 text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Notes auto-save locally per module
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsNotepadOpen(true)}
        className="md:hidden fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-full shadow-2xl border border-slate-700 z-40"
      >
        <PenTool size={20} />
      </button>

    </div>
  );
};