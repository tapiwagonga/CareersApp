import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  LogOut,
  Monitor,
  Volume2,
  VolumeX,
  BrainCircuit,
  Activity,
  BarChart3,
  ArrowRight,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Home,
  Loader2,
  MessageSquare
} from "lucide-react";
import { InterviewSetup } from "./InterviewSetup";
import { UserProfile } from "../../types";

type SessionState = "SETUP" | "ACTIVE" | "ANALYSIS";

interface Message {
  role: "ai" | "user";
  content: string;
  evaluation?: string;
  timestamp: number;
}

interface ReportData {
  overall_score: number;
  decision: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

interface Props {
  role: string;
  user: UserProfile;
  company?: string;
  jdContext?: string;
  onClose: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const InterviewSession = ({ user, role: defaultRole, company: defaultCompany = "", jdContext: defaultJd = "", onClose }: Props) => {
  const [status, setStatus] = useState<SessionState>("SETUP");
  const MAX_QUESTIONS = 5;

  const [sessionRole, setSessionRole] = useState(defaultRole);
  const [sessionCompany, setSessionCompany] = useState(defaultCompany);
  const [sessionJd, setSessionJd] = useState(defaultJd);
  const [sessionVoice, setSessionVoice] = useState("uk-female");
  const [sessionStyle, setSessionStyle] = useState("balanced");

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [report, setReport] = useState<ReportData | null>(null);

  const recognition = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const userSpeakingRef = useRef(false);
  
  useEffect(() => {
    userSpeakingRef.current = isUserSpeaking;
  }, [isUserSpeaking]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentInput]);

  const stopAudio = useCallback(() => {
    const synth = synthRef.current;
    if (synth) {
      synth.cancel();
    }
    setIsAiSpeaking(false);
  }, []);

  const loadVoices = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    const voices = synth.getVoices();
    let best = null;

    const findVoice = (keywords: string[]) => {
      for (const kw of keywords) {
        const match = voices.find(v => v.name.toLowerCase().includes(kw.toLowerCase()));
        if (match) return match;
      }
      return null;
    };

    if (sessionVoice === "uk-female") {
      best = findVoice(["microsoft sonia online", "google uk english female", "serena premium", "uk english female", "en-gb"]);
    } else if (sessionVoice === "uk-male") {
      best = findVoice(["microsoft ryan online", "google uk english male", "daniel premium", "uk english male", "en-gb"]);
    } else if (sessionVoice === "us-female") {
      best = findVoice(["microsoft aria online", "google us english", "samantha premium", "samantha", "ava", "us english female"]);
    } else {
      best = findVoice(["microsoft guy online", "google us english male", "alex", "tom", "us english male"]);
    }

    setSelectedVoice(best || voices.find(v => v.lang.startsWith("en")) || voices[0] || null);
  }, [sessionVoice]);

  useEffect(() => {
    loadVoices();
  }, [sessionVoice, loadVoices]);

  const speak = useCallback(
    (text: string) => {
      if (!audioEnabled || !text) return;

      const synth = synthRef.current;
      if (!synth) return;

      stopAudio();

      const cleanText = text
        .replace(/\[Image of.*?\]/gi, "")
        .replace(/[*#_`]/g, "")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);

      try {
        synth.speak(utterance);
      } catch (e) {
        setIsAiSpeaking(false);
      }
    },
    [audioEnabled, selectedVoice, stopAudio]
  );

  const addMessage = useCallback((roleValue: "ai" | "user", content: string, evaluation?: string) => {
    setMessages(prev => [...prev, { role: roleValue, content, evaluation, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = "en-GB";

      recognition.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setCurrentInput(prev => {
            const separator = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
            return prev + separator + finalTranscript.trim();
          });
        }
      };

      recognition.current.onerror = () => {
        setIsUserSpeaking(false);
      };

      recognition.current.onstart = () => setIsUserSpeaking(true);
      recognition.current.onend = () => setIsUserSpeaking(false);
    }

    const synth = synthRef.current;
    if (synth) {
      synth.onvoiceschanged = loadVoices;
      loadVoices();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAudio();
        if (recognition.current && userSpeakingRef.current) {
          try {
            recognition.current.stop();
          } catch {
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      stopAudio();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopAudio();
      if (recognition.current) {
        try {
          recognition.current.stop();
        } catch {
        }
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (synthRef.current) synthRef.current.onvoiceschanged = null;
    };
  }, [stopAudio, loadVoices]);

  const toggleMic = useCallback(() => {
    if (!recognition.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    stopAudio();

    try {
      if (userSpeakingRef.current) {
        recognition.current.stop();
      } else {
        recognition.current.start();
      }
    } catch {
      setIsUserSpeaking(false);
    }
  }, [stopAudio]);

  const startSession = useCallback(async (r: string, c: string, j: string, v: string, s: string) => {
    setSessionRole(r);
    setSessionCompany(c);
    setSessionJd(j);
    setSessionVoice(v);
    setSessionStyle(s);

    setStatus("ACTIVE");
    setIsAiThinking(true);
    setTurnCount(1);

    const styleDirective = s === "strict" ? "Adopt a strict, highly rigorous technical tone." : s === "casual" ? "Adopt a casual, friendly, and conversational tone." : "Adopt a balanced and fair professional tone.";
    const enrichedContext = `${j}\n\nInterview Persona Directive: ${styleDirective}`;

    try {
      const res = await axios.post("/api/v1/interview/next", {
        history: [],
        role: r,
        company: c,
        context: enrichedContext,
        user_input: "START_INTERVIEW"
      });

      if (!res.data || !res.data.text) {
        throw new Error("Invalid response");
      }

      const aiText = res.data.text;
      addMessage("ai", aiText, res.data.evaluation);
      speak(aiText);
    } catch (e) {
      alert("A network disruption occurred. The session has been safely closed to protect your progress.");
      onClose();
    } finally {
      setIsAiThinking(false);
    }
  }, [addMessage, speak, onClose]);

  const generateReport = useCallback(
    async (historyOverride?: Array<{ role: string; content: string }>) => {
      setIsAiThinking(true);
      setShowExitConfirm(false);
      stopAudio();

      try {
        const historyPayload =
          historyOverride || messages.map(m => ({ role: m.role, content: m.content }));

        const res = await axios.post("/api/v1/interview/finalize", {
          history: historyPayload,
          role: sessionRole
        });

        if (!res.data || !res.data.overall_score) {
          throw new Error("Invalid report");
        }

        setReport(res.data);
        setStatus("ANALYSIS");
      } catch (e) {
        alert("The evaluation server could not be reached. Safely returning to the dashboard.");
        onClose();
      } finally {
        setIsAiThinking(false);
      }
    },
    [messages, sessionRole, stopAudio, onClose]
  );

  const handleSendMessage = useCallback(async () => {
    if (!currentInput.trim()) return;

    const userText = currentInput.trim();

    const historyWithUser = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText }
    ];

    addMessage("user", userText);
    setCurrentInput("");
    stopAudio();

    if (userSpeakingRef.current && recognition.current) {
      try {
        recognition.current.stop();
      } catch {
      }
    }

    if (turnCount >= MAX_QUESTIONS) {
      await generateReport(historyWithUser);
      return;
    }

    setIsAiThinking(true);

    const styleDirective = sessionStyle === "strict" ? "Adopt a strict, highly rigorous technical tone." : sessionStyle === "casual" ? "Adopt a casual, friendly, and conversational tone." : "Adopt a balanced and fair professional tone.";
    const enrichedContext = `${sessionJd}\n\nInterview Persona Directive: ${styleDirective}`;

    try {
      const res = await axios.post("/api/v1/interview/next", {
        history: historyWithUser,
        user_input: userText,
        role: sessionRole,
        company: sessionCompany,
        context: enrichedContext
      });

      if (!res.data || !res.data.text) {
        throw new Error("Invalid backend response");
      }

      setTurnCount(prev => prev + 1);

      const aiResponse = res.data.text;
      let evaluation = res.data.evaluation;

      if (!evaluation || evaluation === "Error parsing evaluation." || evaluation === "N/A") {
        evaluation = "Response captured.";
      }

      addMessage("ai", aiResponse, evaluation);
      speak(aiResponse);
    } catch (e) {
      alert("Connection lost. The session has been safely closed to protect your data.");
      onClose();
    } finally {
      setIsAiThinking(false);
    }
  }, [
    currentInput,
    messages,
    addMessage,
    stopAudio,
    turnCount,
    sessionRole,
    sessionCompany,
    sessionJd,
    sessionStyle,
    generateReport,
    speak,
    onClose
  ]);

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\[Image of.*?\])/gi);
    return parts.map((part, index) => {
      const match = part.match(/\[Image of(.*?)\]/i);
      if (match) {
        return (
          <div
            key={index}
            className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 flex items-center gap-3 shadow-inner"
          >
            <ImageIcon size={18} className="text-slate-900" />
            <span>Visualising {match[1]}</span>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (status === "SETUP") {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <InterviewSetup 
              initialRole={sessionRole}
              initialCompany={sessionCompany}
              initialJd={sessionJd}
              onStart={startSession}
              onCancel={onClose}
          />
      </div>
    );
  }

  if (status === "ANALYSIS" && report) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm relative z-20">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md shadow-slate-900/20">
              <BarChart3 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-900 tracking-tight">Evaluation Report</h1>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{sessionRole}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-sm font-bold transition-colors"
          >
            <Home size={16} />
            Exit to Home
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto space-y-8 relative z-10">
            <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-slate-200 flex flex-col md:flex-row items-center gap-10">
              <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-sm">
                  <circle cx="50%" cy="50%" r="45%" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke={report.overall_score > 70 ? "#0f172a" : report.overall_score > 40 ? "#64748b" : "#94a3b8"}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * report.overall_score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-center flex flex-col items-center justify-center">
                  <div className="text-5xl font-black text-slate-900 tracking-tighter">{report.overall_score}</div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Score</div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="inline-block px-4 py-1.5 rounded-lg bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest mb-4 border border-slate-200">
                  {report.decision}
                </div>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">{report.summary}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-900/5 relative overflow-hidden">
                <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-3 relative z-10">
                  <CheckCircle2 className="text-slate-900" size={24} strokeWidth={2.5} /> Demonstrated Strengths
                </h3>
                <ul className="space-y-4 relative z-10">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-slate-600 leading-relaxed flex gap-3 font-medium">
                      <span className="text-slate-900 mt-0.5">
                        <CheckCircle2 size={18} />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-900/5 relative overflow-hidden">
                <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-3 relative z-10">
                  <Activity className="text-slate-500" size={24} strokeWidth={2.5} /> Areas for Growth
                </h3>
                <ul className="space-y-4 relative z-10">
                  {report.weaknesses.map((w, i) => (
                    <li key={i} className="text-slate-600 leading-relaxed flex gap-3 font-medium">
                      <span className="text-slate-500 mt-0.5">
                        <Activity size={18} />
                      </span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900 selection:bg-slate-200 selection:text-black">
      
      <div className="hidden md:flex w-1/3 max-w-md bg-white border-r border-slate-200 flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <MessageSquare className="text-slate-400" size={20} />
          <div>
            <h2 className="font-black text-sm uppercase tracking-widest text-slate-900">Live Transcript</h2>
            <p className="text-xs font-medium text-slate-500">{sessionCompany ? `${sessionRole} at ${sessionCompany}` : sessionRole}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 font-medium text-sm mt-10">
              The session will be recorded here.
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.timestamp}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 mr-1">
                {msg.role === "user" ? user.name : "Interviewer"}
              </div>
              <div
                className={`p-4 rounded-2xl max-w-[90%] text-sm font-medium leading-relaxed ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white rounded-br-none shadow-md"
                    : "bg-slate-50 text-slate-800 rounded-bl-none border border-slate-200 shadow-sm"
                }`}
              >
                {renderMessageContent(msg.content)}
              </div>
              {msg.evaluation && msg.role === "ai" && (
                <div className="mt-2 text-xs text-slate-600 font-mono bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl w-full flex items-start gap-2 shadow-sm">
                  <ShieldAlert size={14} className="shrink-0 text-indigo-500 mt-0.5" />
                  <span>{msg.evaluation}</span>
                </div>
              )}
            </motion.div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      <div className="flex-1 relative flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0,transparent_100%)] pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="relative flex items-center justify-center w-64 h-64 mb-12">
            {isAiSpeaking && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 border border-slate-300 rounded-full"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 border border-slate-200 rounded-full"
                />
              </>
            )}

            <div
              className={`w-40 h-40 rounded-full shadow-2xl flex items-center justify-center transition-all duration-700 relative z-10 ${
                isAiSpeaking ? "bg-slate-900 shadow-slate-900/20 scale-105" : "bg-white border border-slate-200 scale-100"
              }`}
            >
              <BrainCircuit size={56} className={isAiSpeaking ? "text-white" : "text-slate-800"} strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200 px-8 py-3.5 rounded-2xl shadow-sm">
            {isAiThinking ? (
              <>
                <Loader2 size={18} className="text-indigo-500 animate-spin" />
                <span className="text-xs font-black tracking-widest uppercase text-slate-700">Analysing Response</span>
              </>
            ) : isAiSpeaking ? (
              <>
                <Volume2 size={18} className="text-emerald-500" />
                <span className="text-xs font-black tracking-widest uppercase text-slate-900">Interviewer Speaking</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-black tracking-widest uppercase text-slate-600">Awaiting Input</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 p-6 md:px-12 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div className="flex items-center gap-3">
              <div className={`flex-1 flex items-center gap-3 bg-slate-50 border rounded-2xl p-2 transition-all duration-300 ${
                isUserSpeaking ? "border-indigo-400 bg-white shadow-md" : "border-slate-200"
              }`}>
                <div className="pl-4 text-slate-400">
                  <Monitor size={20} />
                </div>
                <input
                  value={currentInput}
                  onChange={e => {
                    setCurrentInput(e.target.value);
                    if (isAiSpeaking) stopAudio();
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") void handleSendMessage();
                  }}
                  placeholder={isUserSpeaking ? "Listening to your microphone..." : "Type your answer manually"}
                  className="flex-1 bg-transparent border-none text-slate-900 text-base outline-none placeholder-slate-400 h-12 font-medium"
                  disabled={isUserSpeaking || isAiThinking}
                />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!currentInput.trim() || isAiThinking}
                  className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white hover:bg-slate-800 disabled:opacity-50 disabled:scale-95 transition-all shadow-md shrink-0"
                >
                  <ArrowRight size={20} />
                </button>
              </div>

              <div className="relative shrink-0">
                {isUserSpeaking && <span className="absolute inset-0 rounded-full bg-indigo-200 animate-ping opacity-75" />}
                <button
                  onClick={toggleMic}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 relative z-10 ${
                    isUserSpeaking
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {isUserSpeaking ? <div className="w-5 h-5 bg-white rounded-sm" /> : <Mic size={24} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setAudioEnabled(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${
                  audioEnabled
                    ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    : "bg-slate-100 border-slate-200 text-slate-400"
                }`}
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {audioEnabled ? "Voice On" : "Voice Off"}
              </button>

              <button
                onClick={() => setShowExitConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-black uppercase tracking-widest transition-colors"
              >
                <LogOut size={16} /> End Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-slate-900" size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Pause Interview</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                End the session and get a partial evaluation, or exit to home.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm transition-all tracking-wide"
                >
                  Resume Session
                </button>
                <button
                  onClick={() => void generateReport()}
                  className="py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md tracking-wide"
                >
                  Generate Evaluation
                </button>
                <button
                  onClick={onClose}
                  className="py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all tracking-wide mt-2"
                >
                  Exit to Home
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};