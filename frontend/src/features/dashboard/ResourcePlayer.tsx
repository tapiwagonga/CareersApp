import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  ExternalLink,
  Award,
  Star,
  ChevronRight,
  AlertCircle,
  Clock,
  Play,
  BookOpen,
  Mic,
  Layout,
  Zap,
  FileText,
  ShieldAlert
} from "lucide-react";
import { RoadmapTask } from "../../types";

interface Props {
  task: RoadmapTask | null;
  onClose: () => void;
  onComplete: (rating?: number) => void;
}

type ResourceKind =
  | "video"
  | "audio"
  | "article"
  | "doc"
  | "course"
  | "project"
  | "boss_battle"
  | "interactive"
  | "other";

const normaliseType = (t: any) => (t?.type ?? "doc").toString().trim();

const getKind = (taskTypeRaw: string): ResourceKind => {
  const t = (taskTypeRaw || "").toLowerCase();

  if (t === "watch" || t === "video") return "video";
  if (t === "audio") return "audio";
  if (t === "article") return "article";
  if (t === "doc" || t === "documentation") return "doc";
  if (t === "course") return "course";
  if (t === "project" || t === "build") return "project";
  if (t === "boss_battle") return "boss_battle";
  if (t === "interactive" || t === "practice") return "interactive";
  if (t === "read") return "article";

  return "other";
};

const isCompleted = (t: any) => t?.status === "Completed" || t?.status === "Done" || Boolean(t?.is_completed);

const KIND_ICON = {
  video: Play,
  audio: Mic,
  article: BookOpen,
  doc: FileText,
  course: Layout,
  project: Zap,
  boss_battle: ShieldAlert,
  interactive: Zap,
  other: FileText
} as const;

const KIND_BADGE = {
  video: "bg-red-500/10 text-red-300 border-red-500/20",
  audio: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  article: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  doc: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  course: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  project: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  boss_battle: "bg-slate-900 text-yellow-300 border-yellow-500/20",
  interactive: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  other: "bg-slate-500/10 text-slate-300 border-slate-500/20"
} as const;

const KIND_LABEL = {
  video: "Video",
  audio: "Audio",
  article: "Read",
  doc: "Docs",
  course: "Course",
  project: "Build",
  boss_battle: "Boss battle",
  interactive: "Interactive",
  other: "Resource"
} as const;

const OFFICIAL_DOCS_MAP: Array<{ key: string; url: string }> = [
  { key: "react", url: "https://react.dev/learn" },
  { key: "css", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
  { key: "figma", url: "https://help.figma.com/hc/en-us" },
  { key: "prototyping", url: "https://help.figma.com/hc/en-us/categories/360002042553-Prototypes" },
  { key: "design systems", url: "https://m3.material.io/foundations/overview" },
  { key: "interaction design", url: "https://www.nngroup.com/topic/interaction-design/" }
];

const resolveUrl = (rawUrl: string) => {
  const u = (rawUrl || "").trim();
  if (!u) return "";

  try {
    const parsed = new URL(u);

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    const isGoogleSearch = host.includes("google.") && path === "/search";
    if (isGoogleSearch) {
      const q = (parsed.searchParams.get("q") || "").trim().toLowerCase();
      if (!q) return u;

      const hit =
        OFFICIAL_DOCS_MAP.find(x => q === x.key) ??
        OFFICIAL_DOCS_MAP.find(x => q.includes(x.key));

      return hit ? hit.url : u;
    }

    return u;
  } catch {
    return u;
  }
};

const isPdfUrl = (u: string) => {
  const s = (u || "").toLowerCase();
  return s.includes(".pdf") || s.includes("application/pdf");
};

export const ResourcePlayer = ({ task, onClose, onComplete }: Props) => {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [openedExternal, setOpenedExternal] = useState(false);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    setPlaying(true);
    setProgress(0);
    setPlayedSeconds(0);
    setDuration(0);
    setShowReview(false);
    setRating(0);
    setOpenedExternal(false);
  }, [task]);

  const rawType = normaliseType(task);
  const kind: ResourceKind = getKind(rawType);

  const rawUrl = useMemo(() => {
    const u = (task as any)?.meta?.url;
    return typeof u === "string" ? u.trim() : "";
  }, [task]);

  const url = useMemo(() => resolveUrl(rawUrl), [rawUrl]);

  const platform = useMemo(() => ((task as any)?.meta?.platform || "").toString(), [task]);
  const provider = useMemo(() => ((task as any)?.meta?.provider || "").toString(), [task]);
  const qualityScore = useMemo(() => Number((task as any)?.meta?.quality_score || 0), [task]);

  const Icon = KIND_ICON[kind] || KIND_ICON.other;

  const isVideo = kind === "video";
  const isAudio = kind === "audio";
  const needsWatchRule = isVideo || isAudio;

  const completionThreshold = 0.75;
  const progressPct = Math.round(progress * 100);

  const canEmbed = useMemo(() => {
    if (!url) return false;
    if (isPdfUrl(url)) return true;
    return false;
  }, [url]);

  useEffect(() => {
    if (!needsWatchRule && canEmbed && url) setOpenedExternal(true);
  }, [needsWatchRule, canEmbed, url]);

  const meetsWatchRule = useMemo(() => {
    if (!needsWatchRule) return true;
    if (duration > 0) return playedSeconds / duration >= completionThreshold;
    return progress >= completionThreshold;
  }, [needsWatchRule, duration, playedSeconds, progress, completionThreshold]);

  const canComplete = useMemo(() => {
    if (needsWatchRule) return meetsWatchRule;
    if (url) return openedExternal;
    return true;
  }, [needsWatchRule, meetsWatchRule, url, openedExternal]);

  const watchHint = useMemo(() => {
    if (!needsWatchRule) return "";
    const need = Math.round(completionThreshold * 100);
    if (meetsWatchRule) return "Requirement met";
    return "Watch at least " + need + " percent to complete";
  }, [needsWatchRule, completionThreshold, meetsWatchRule]);

  const externalHint = useMemo(() => {
    if (!url) return "";
    if (needsWatchRule) return "";
    if (openedExternal) return "";
    return "Open the resource first to unlock completion";
  }, [url, needsWatchRule, openedExternal]);

  if (!task) return null;

  const alreadyDone = isCompleted(task);

  const handleProgress = (state: any) => {
    if (!needsWatchRule || !state) return;

    const pct = Number(state.played || 0);
    const secs = Number(state.playedSeconds || 0);

    setProgress(Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0);
    setPlayedSeconds(Number.isFinite(secs) ? Math.max(0, secs) : 0);

    if (!duration && playerRef.current && typeof playerRef.current.getDuration === "function") {
      const d = Number(playerRef.current.getDuration());
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }
  };

  const handleReady = () => {
    if (!playerRef.current || typeof playerRef.current.getDuration !== "function") return;
    const d = Number(playerRef.current.getDuration());
    if (Number.isFinite(d) && d > 0) setDuration(d);
  };

  const handleFinish = () => {
    setShowReview(true);
  };

  const submitReview = () => {
    if (!canComplete) return;
    onComplete(rating || undefined);
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
            type="button"
          >
            <X size={24} />
          </button>

          <div className="w-full max-w-6xl bg-[#0F172A] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col md:flex-row h-[85vh]">
            <div className="flex-1 bg-black relative flex flex-col justify-center min-h-0">
              {needsWatchRule ? (
                <div className="relative w-full h-full">
                  <ReactPlayer
                    ref={playerRef}
                    src={url}
                    width="100%"
                    height="100%"
                    playing={playing}
                    controls={true}
                    onReady={handleReady}
                    onProgress={handleProgress}
                    onEnded={handleFinish}
                    config={{
                      youtube: {
                        playerVars: { modestbranding: 1, rel: 0, playsinline: 1 }
                      } as any
                    }}
                  />

                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800 pointer-events-none">
                    <motion.div className="h-full bg-indigo-500" style={{ width: `${progress * 100}%` }} />
                  </div>

                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${KIND_BADGE[kind]}`}
                    >
                      <Icon size={12} />
                      {KIND_LABEL[kind]}
                    </span>

                    {platform ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        {platform}
                      </span>
                    ) : null}

                    {provider ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        {provider}
                      </span>
                    ) : null}

                    {qualityScore ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        Quality {qualityScore}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : url && canEmbed ? (
                <div className="relative w-full h-full min-h-0">
                  <iframe
                    title={task.title || "Resource"}
                    src={url}
                    className="w-full h-full"
                    style={{ border: 0 }}
                  />
                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${KIND_BADGE[kind]}`}
                    >
                      <Icon size={12} />
                      {KIND_LABEL[kind]}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 md:p-12 text-center h-full space-y-6">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${KIND_BADGE[kind]}`}
                    >
                      <Icon size={12} />
                      {KIND_LABEL[kind]}
                    </span>

                    {platform ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        {platform}
                      </span>
                    ) : null}

                    {provider ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        {provider}
                      </span>
                    ) : null}

                    {qualityScore ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white/5 text-gray-200 border-white/10">
                        Quality {qualityScore}
                      </span>
                    ) : null}
                  </div>

                  <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-300 border border-indigo-500/30">
                    <ExternalLink size={40} />
                  </div>

                  <h2 className="text-3xl font-black text-white max-w-2xl leading-tight">{task.title}</h2>
                  <p className="text-gray-400 max-w-xl text-sm leading-relaxed">{task.description}</p>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpenedExternal(true)}
                      className="px-8 py-4 bg-white text-black font-black rounded-2xl hover:scale-105 transition-transform flex items-center gap-3"
                    >
                      Open resource <ExternalLink size={18} />
                    </a>
                  ) : (
                    <div className="text-gray-500 text-sm">No link found for this resource</div>
                  )}

                  {externalHint ? (
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {externalHint}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="w-full md:w-[420px] bg-[#111C33] p-8 flex flex-col border-l border-gray-800 relative overflow-hidden min-h-0">
              <div className="mb-auto">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${KIND_BADGE[kind]}`}
                  >
                    <Icon size={12} />
                    {KIND_LABEL[kind]}
                  </span>

                  {alreadyDone ? (
                    <span className="flex items-center gap-1 text-[10px] font-black text-green-300 uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : null}
                </div>

                <h1 className="text-2xl font-black text-white mb-4 leading-tight">{task.title}</h1>

                <div className="text-gray-300 text-sm leading-relaxed space-y-4">
                  <p className="text-gray-400">{task.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-gray-500 text-xs font-medium">
                    {task.estimated_minutes ? (
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        Est {task.estimated_minutes} min
                      </span>
                    ) : null}

                    <span className="flex items-center gap-2">
                      <Award size={14} />
                      XP {task.xp_reward || 0}
                    </span>

                    {needsWatchRule && duration > 0 ? (
                      <span className="flex items-center gap-2">
                        <Play size={14} />
                        {Math.round(playedSeconds / 60)} of {Math.round(duration / 60)} min
                      </span>
                    ) : null}

                    {needsWatchRule ? (
                      <span className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        {progressPct} percent
                      </span>
                    ) : null}
                  </div>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpenedExternal(true)}
                      className="inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                    >
                      Open in browser <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </div>

              <AnimatePresence>
                {showReview && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="absolute inset-0 bg-[#111C33] p-8 z-20 flex flex-col justify-center items-center text-center"
                  >
                    <div className="w-16 h-16 bg-yellow-500/20 text-yellow-300 rounded-2xl flex items-center justify-center mb-4 border border-yellow-500/20">
                      <Award size={32} />
                    </div>

                    <h3 className="text-xl font-black text-white mb-2">Resource complete</h3>
                    <p className="text-gray-400 text-sm mb-6">Rate usefulness</p>

                    <div className="flex gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`p-2 transition-all ${rating >= star ? "text-yellow-300 scale-110" : "text-gray-600 hover:text-gray-400"}`}
                          type="button"
                        >
                          <Star size={28} fill={rating >= star ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>

                    {!canComplete ? (
                      <div className="mb-4 text-[11px] text-gray-400 flex items-center gap-2">
                        <AlertCircle size={14} />
                        {watchHint || externalHint}
                      </div>
                    ) : null}

                    <button
                      onClick={submitReview}
                      disabled={!canComplete}
                      className="w-full bg-white text-black font-black py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all"
                      type="button"
                    >
                      Complete and collect XP
                    </button>

                    <button
                      onClick={() => setShowReview(false)}
                      className="mt-3 w-full py-3 rounded-2xl font-black text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                      type="button"
                    >
                      Back
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showReview ? (
                <div className="mt-8 space-y-4">
                  {needsWatchRule ? (
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span className="font-black uppercase tracking-widest">Progress</span>
                        <span className="font-black">{progressPct} percent</span>
                      </div>

                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-indigo-500" animate={{ width: `${progress * 100}%` }} />
                      </div>

                      {watchHint ? (
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-2">
                          <AlertCircle size={14} />
                          {watchHint}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setPlaying(v => !v)}
                        className="mt-4 w-full py-3 rounded-2xl font-black text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                      >
                        {playing ? "Pause" : "Play"}
                      </button>
                    </div>
                  ) : externalHint ? (
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/10 text-[11px] text-gray-400 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {externalHint}
                    </div>
                  ) : null}

                  <button
                    onClick={() => setShowReview(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                    type="button"
                  >
                    Mark as complete <ChevronRight size={18} />
                  </button>

                  {needsWatchRule && !meetsWatchRule ? (
                    <div className="text-[11px] text-gray-500 flex items-center justify-center gap-2">
                      <AlertCircle size={14} />
                      Completion locked until watch requirement is met
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};