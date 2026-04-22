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
  Code,
  Target,
  Award
} from "lucide-react";

import { AnalysisResult, RoadmapTask, RoadmapPhase } from "../../types";
import { ResourcePlayer } from "./ResourcePlayer";
import { roadmapService } from "../../services/roadmapService";
import { SkillQuiz } from "./SkillQuiz";
import { api } from "../../services/api";
import { DeveloperPad } from "./DeveloperPad";

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

const XP_VALUES: Record<string, number> = {
  video: 50, audio: 50, article: 50, doc: 50, documentation: 50,
  deep_dive: 100, interactive: 150, course: 200, build: 300,
  project: 300, boss_battle: 500, book: 100, watch: 50, read: 50
};

const getTaskXp = (type: string) => XP_VALUES[type] || 50;

const RANK_TIERS = [
  { name: 'Novice', min: 0, colour: 'text-slate-500', bg: 'bg-slate-100' },
  { name: 'Apprentice', min: 500, colour: 'text-emerald-500', bg: 'bg-emerald-100' },
  { name: 'Adept', min: 1500, colour: 'text-indigo-500', bg: 'bg-indigo-100' },
  { name: 'Expert', min: 3000, colour: 'text-violet-500', bg: 'bg-violet-100' },
  { name: 'Master', min: 5000, colour: 'text-rose-500', bg: 'bg-rose-100' },
  { name: 'Grandmaster', min: 10000, colour: 'text-amber-500', bg: 'bg-amber-100' }
];

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
  boss_battle: "bg-slate-900 text-amber-400 border-amber-500 shadow-amber-500/20 shadow-lg",
  book: "bg-amber-50 text-amber-600 border-amber-100"
};

const isInAppDocType = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  return ["doc", "documentation", "article", "deep_dive", "interactive", "read", "book"].includes(t);
};

const TaskSkeleton = () => (
  <div className="w-full p-6 md:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex gap-6 items-start animate-pulse mb-4">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
    <div className="flex-1 w-full">
      <div className="h-6 bg-slate-100 rounded w-1/2 mb-3" />
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-4/5 mb-6" />
      <div className="h-10 bg-slate-50 rounded-xl w-full" />
    </div>
  </div>
);

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
  onToggle: (rating?: number, e?: React.MouseEvent) => void;
}) => {
  const [rating, setRating] = useState<number>(0);
  const [projectLink, setProjectLink] = useState("");
  const type = normaliseTaskType(task);
  const isProject = type === "boss_battle" || type === "project";
  const xpReward = getTaskXp(type);
  
  const Icon = TYPE_ICONS[type] || FileText;
  const colourClass = TYPE_COLOURS[type] || "bg-slate-50 text-slate-600 border-slate-200";
  const meta = (task as any).meta || {};

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProject && !isCompleted && !projectLink.trim()) {
      alert("Please submit a link to your project repository.");
      return;
    }
    onToggle(rating > 0 ? rating : undefined, e);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full p-6 md:p-8 rounded-3xl border transition-all duration-300 ${
        isCompleted ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      } ${type === 'boss_battle' && !isCompleted ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
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
            <div className="flex items-center gap-2 shrink-0">
              {meta.quality_score && !isCompleted && (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md text-[9px] font-black tracking-widest">
                  <Star size={10} fill="currentColor" /> {meta.quality_score} SCORE
                </span>
              )}
              <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black tracking-widest border ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                <Zap size={10} className={isCompleted ? "fill-emerald-600" : "fill-indigo-600"} /> {xpReward} XP
              </span>
            </div>
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md ${type === 'boss_battle' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
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

export const DatabaseDashboard = ({ data, userId, createdAt, onReset, onExit, onStartInterview, onUpdate }: DashboardProps) => {
  const [localData, setLocalData] = useState<AnalysisResult>(data);
  const [localPhases, setLocalPhases] = useState<any[]>([]);
  const [activePhaseIndex, setActivePhaseIndex] = useState(1);
  const [activeResource, setActiveResource] = useState<RoadmapTask | null>(null);
  const [quizSkill, setQuizSkill] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocPreviewState | null>(null);
  
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [moduleNotes, setModuleNotes] = useState<Record<number, string>>({});
  const [streakDays, setStreakDays] = useState(1);
  const [dailyQuestsCompleted, setDailyQuestsCompleted] = useState(0);
  const [xpPopups, setXpPopups] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);
  const hasFetchedRef = useRef(false);

  const resumeMeta = useMemo(() => ((data as any)?._resume as ResumeMeta | undefined) ?? undefined, [data]);
  const roleTitle = useMemo(() => ((localData as any)?.role_name || (resumeMeta?.roleTitle ?? "Role")).toString(), [localData, resumeMeta]);
  const createdAtResolved = useMemo(() => createdAt || resumeMeta?.createdAt || new Date().toISOString(), [createdAt, resumeMeta]);

  const persistSave = useCallback((nextData: AnalysisResult) => {
    if (onUpdate) onUpdate(nextData);
    if (!userId) return;
    roadmapService.saveRoadmap(userId, roleTitle, nextData, { phaseIndex: activePhaseIndex }).catch(console.error);
  }, [userId, roleTitle, activePhaseIndex, onUpdate]);

  useEffect(() => {
    if (!data?.roadmap || hasFetchedRef.current) return;
    
    let isMounted = true;
    hasFetchedRef.current = true;

    const fetchResources = async () => {
      const initialPhases = data.roadmap.map((p: any) => ({
        ...p,
        isLoading: !p.tasks || p.tasks.length === 0,
        tasks: p.tasks || []
      }));

      setLocalPhases(initialPhases);
      const resolvedPhases = [...initialPhases];

      const fetchPromises = initialPhases.map(async (phase, idx) => {
        if (!phase.isLoading) return;

        try {
          const res = await api.get(`/api/resources/${encodeURIComponent(phase.focus_area || "")}?limit=15`);
          if (!isMounted) return;
          
          const dbItems = res.data || [];
          const newTasks = dbItems.map((item: any) => ({
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            estimated_minutes: item.estimated_minutes || 30,
            status: "Pending",
            is_completed: false,
            meta: {
              url: item.url,
              platform: item.platform,
              provider: item.provider,
              quality_score: item.quality_score,
              iframe_safe: item.iframe_safe
            }
          }));

          resolvedPhases[idx] = { ...resolvedPhases[idx], tasks: newTasks, isLoading: false };
          setLocalPhases([...resolvedPhases]);
        } catch (error) {
          if (!isMounted) return;
          resolvedPhases[idx] = { ...resolvedPhases[idx], isLoading: false };
          setLocalPhases([...resolvedPhases]);
        }
      });

      await Promise.all(fetchPromises);
      
      if (isMounted) {
        setLocalData(prevData => ({ ...prevData, roadmap: resolvedPhases }));
      }
    };

    fetchResources();
    return () => { isMounted = false; };
  }, [data]);

  const stats = useMemo(() => {
    let totalXP = 0;
    let currentXP = 0;
    let totalRequiredHours = 0;
    let completedHours = 0;

    localPhases.forEach(phase => {
      safeArray<RoadmapTask>(phase.tasks).forEach(t => {
        const type = normaliseTaskType(t);
        const xp = getTaskXp(type);
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

    let currentRank = RANK_TIERS[0];
    let nextRank = RANK_TIERS[1];
    
    for (let i = 0; i < RANK_TIERS.length; i++) {
      if (currentXP >= RANK_TIERS[i].min) {
        currentRank = RANK_TIERS[i];
        nextRank = RANK_TIERS[i + 1] || RANK_TIERS[i];
      }
    }

    const rankProgress = currentRank.name === nextRank.name 
      ? 100 
      : Math.round(((currentXP - currentRank.min) / (nextRank.min - currentRank.min)) * 100);

    return { 
      totalXP, currentXP, progress, velocityHoursPerDay, 
      projectedDaysRemaining, currentRank, nextRank, rankProgress 
    };
  }, [localPhases, createdAtResolved]);

  const activePhase = useMemo(() => {
    const phase = localPhases[activePhaseIndex - 1];
    if (!phase) return null;
    return { ...phase, tasks: safeArray<RoadmapTask>(phase.tasks) };
  }, [localPhases, activePhaseIndex]);

  const categorisedTasks = useMemo(() => {
    const tasks = activePhase?.tasks || [];
    return {
      theory: tasks.filter((t: any) => ["doc", "documentation", "article", "book", "deep_dive", "read"].includes(normaliseTaskType(t))),
      media: tasks.filter((t: any) => ["video", "audio", "watch"].includes(normaliseTaskType(t))),
      practical: tasks.filter((t: any) => ["interactive", "project", "boss_battle", "course", "build", "practice"].includes(normaliseTaskType(t)))
    };
  }, [activePhase]);

  const spawnXpPopup = useCallback((x: number, y: number, amount: number) => {
    const id = Date.now();
    setXpPopups(prev => [...prev, { id, x, y, amount }]);
    setTimeout(() => {
      setXpPopups(prev => prev.filter(p => p.id !== id));
    }, 1500);
  }, []);

  const handleTaskToggleComplete = useCallback((phaseIdx: number, taskKey: string, rating?: number, e?: React.MouseEvent) => {
    setLocalPhases(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const phase = next[phaseIdx];
      let gainedXp = 0;
      
      phase.tasks = phase.tasks.map((t: any, idx: number) => {
        if (makeTaskKey(t, idx) !== taskKey) return t;
        const done = isTaskDone(t);
        t.status = done ? "Pending" : "Completed";
        t.is_completed = !done;
        if (rating && !done) t.meta = { ...t.meta, user_rating: rating };
        
        if (!done) gainedXp = getTaskXp(normaliseTaskType(t));
        
        return t;
      });
      
      if (gainedXp > 0) {
        setDailyQuestsCompleted(dq => Math.min(3, dq + 1));
        if (e) spawnXpPopup(e.clientX, e.clientY, gainedXp);
      }

      setLocalData(prevData => {
        const newData = { ...prevData, roadmap: next };
        persistSave(newData);
        return newData;
      });

      return next;
    });
  }, [persistSave, spawnXpPopup]);

  const openTask = useCallback((phaseIdx: number, taskKey: string) => {
    const phase = localPhases[phaseIdx];
    const task = safeArray<any>(phase?.tasks).find((t: any, idx: number) => makeTaskKey(t, idx) === taskKey);
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
  }, [localPhases]);

  const handleQuizPass = () => {
    setQuizSkill(null);
    setActivePhaseIndex(prev => Math.min(localPhases.length, prev + 1));
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

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award size={64} />
          </div>
          <div className="flex justify-between items-end mb-3 relative z-10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Rank</div>
              <div className={`text-2xl font-black leading-none ${stats.currentRank.colour}`}>
                {stats.currentRank.name}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
              <div className="text-indigo-600 font-black text-sm">{stats.currentXP} XP</div>
              <div>/ {stats.nextRank.min} XP</div>
            </div>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-3 relative z-10">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.rankProgress}%` }} className="h-full bg-indigo-600" />
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-3 border-t border-slate-200/60 relative z-10">
            <span className="flex items-center gap-1"><Activity size={12} className="text-emerald-500" /> {stats.velocityHoursPerDay.toFixed(1)} hrs/day</span>
            <span>Total: {stats.progress}%</span>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <Target size={18} className="text-indigo-600 mt-0.5 shrink-0" />
          <div className="w-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 flex justify-between">
              <span>Daily Quest</span>
              <span>{dailyQuestsCompleted}/3</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(quest => (
                <div key={quest} className={`h-2 flex-1 rounded-full ${dailyQuestsCompleted >= quest ? 'bg-indigo-500' : 'bg-indigo-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
        {localPhases.map((phase, index) => {
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
                isActive ? "bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100" : isLocked ? "bg-transparent border-transparent opacity-50" : "bg-white border-slate-200 hover:border-slate-300"
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
                  {phase.focus_area}
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
  const allTasksDone = !activePhase.isLoading && activePhase.tasks.length > 0 && activePhase.tasks.every((t: any) => isTaskDone(t));

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#F8FAFC] font-sans overflow-hidden">
      
      <AnimatePresence>
        {xpPopups.map(popup => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 1, y: popup.y, x: popup.x, scale: 0.5 }}
            animate={{ opacity: 0, y: popup.y - 150, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fixed z-50 font-black text-3xl text-indigo-500 drop-shadow-xl pointer-events-none flex items-center gap-2"
            style={{ left: 0, top: 0 }}
          >
            +{popup.amount} <Zap size={24} className="fill-indigo-500" />
          </motion.div>
        ))}
      </AnimatePresence>

      <ResourcePlayer task={activeResource} onClose={() => setActiveResource(null)} onComplete={rating => {
        if (activeResource) {
          const tasks = safeArray<any>(localPhases[activePhaseIndex - 1]?.tasks);
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
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{activePhase.focus_area}</h1>
                <button 
                  onClick={() => setIsNotepadOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 transition-colors"
                >
                  <PenTool size={14} /> Developer Pad
                </button>
              </div>
              <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">{activePhase.description}</p>
            </motion.div>

            {activePhase.isLoading ? (
              <div className="space-y-4">
                <TaskSkeleton />
                <TaskSkeleton />
                <TaskSkeleton />
              </div>
            ) : (
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
                        return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating, e) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating, e)} />;
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
                        return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating, e) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating, e)} />;
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
                        return <TaskCard key={taskKey} task={task} isCompleted={isTaskDone(task)} onOpen={() => openTask(activePhaseIndex - 1, taskKey)} onToggle={(rating, e) => handleTaskToggleComplete(activePhaseIndex - 1, taskKey, rating, e)} />;
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {allTasksDone && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-16 bg-white border border-slate-200 p-10 rounded-3xl text-center shadow-xl relative overflow-hidden">
                {activePhaseIndex === localPhases.length ? (
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

      <DeveloperPad 
          isOpen={isNotepadOpen} 
          onClose={() => setIsNotepadOpen(false)} 
          activePhaseIndex={activePhaseIndex}
          activePhaseName={activePhase.focus_area}
          notes={moduleNotes[activePhaseIndex] || ""}
          onNoteChange={handleNoteChange}
        />

      <button
        onClick={() => setIsNotepadOpen(true)}
        className="md:hidden fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-full shadow-2xl border border-slate-700 z-40"
      >
        <PenTool size={20} />
      </button>

    </div>
  );
};