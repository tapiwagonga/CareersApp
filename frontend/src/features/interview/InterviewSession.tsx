import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Avatar, { genConfig } from "react-nice-avatar";
import { 
  Mic, MicOff, LogOut, Video, Monitor, Volume2, VolumeX, 
  BrainCircuit, Activity, BarChart3, Sparkles, ArrowRight,
  Image as ImageIcon, CheckCircle2, AlertCircle
} from "lucide-react";
import { UserProfile } from "../../types";
import { InterviewSetup } from "./InterviewSetup";

/* ---------------- TYPES ---------------- */

type SessionState = "SETUP" | "ACTIVE" | "ANALYSIS";

interface Message {
  role: "ai" | "user";
  content: string;
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
  user: UserProfile;
  defaultRole?: string;
  defaultCompany?: string;
  onClose: () => void;
}

// Global definition for Speech Recognition to satisfy TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/* ---------------- COMPONENT ---------------- */

export const InterviewSession = ({ user, defaultRole, defaultCompany, onClose }: Props) => {
  
  // --- STATE: CONFIG ---
  const [status, setStatus] = useState<SessionState>("SETUP");
  const [role, setRole] = useState(defaultRole || "");
  const [company, setCompany] = useState(defaultCompany || "");
  const [jd, setJd] = useState("");
  
  // We limit the session to 5 questions for a focused MVP experience
  const MAX_QUESTIONS = 5; 
  
  // --- STATE: AUDIO & VOICE ---
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // --- STATE: SESSION ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); 
  const [questionCount, setQuestionCount] = useState(0); // Track turns
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // --- STATE: REPORT ---
  const [report, setReport] = useState<ReportData | null>(null);

  // --- REFS ---
  const recognition = useRef<any>(null);
  const synth = window.speechSynthesis;
  const aiConfig = useRef(genConfig({ 
      sex: "woman", faceColor: "#F9C9B6", hairStyle: "womanLong", 
      hairColor: "#000", glassesStyle: "none", shirtStyle: "hoody" 
  }));

  // --- 1. INITIALIZATION & CLEANUP ---

  useEffect(() => {
    // Initialize Speech Recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = "en-US";

      recognition.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript) {
            setCurrentInput(prev => (prev + " " + finalTranscript).trim());
        }
      };

      recognition.current.onstart = () => setIsUserSpeaking(true);
      recognition.current.onend = () => setIsUserSpeaking(false);
    }

    // Initialize Voices
    const loadVoices = () => {
        const voices = synth.getVoices();
        const preferred = ["Google US English", "Samantha", "Microsoft Zira"];
        const best = voices.find(v => preferred.some(p => v.name.includes(p))) || voices.find(v => v.lang.startsWith("en"));
        setSelectedVoice(best || null);
    };
    synth.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
        stopAudio();
        if (recognition.current) recognition.current.stop();
    };
  }, []);

  // --- 2. AUDIO ENGINE ---

  const stopAudio = () => {
      synth.cancel();
      setIsAiSpeaking(false);
  };

  const speak = (text: string) => {
    if (!audioEnabled || !text) return;
    stopAudio();

    // Remove visual tags and markdown for speech
    const cleanText = text.replace(/\[Image of.*?\]/gi, "").replace(/[*#_`]/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.1; // Slightly faster for natural flow
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    
    synth.speak(utterance);
  };

  const toggleMic = () => {
    if (!recognition.current) {
        alert("Speech recognition is not supported in this browser. Please use Chrome.");
        return;
    }
    
    stopAudio(); // Stop AI if user wants to talk

    if (isUserSpeaking) {
        recognition.current.stop();
    } else {
        recognition.current.start();
    }
  };

  // --- 3. CORE LOGIC ---

  const startSession = async () => {
    setStatus("ACTIVE");
    setIsAiThinking(true);
    
    // Construct Initial Prompt context
    // Ideally, the backend should handle the prompt engineering, 
    // but we pass the context here.
    try {
        const res = await axios.post("/api/v1/interview/next", {
            history: [], // Empty history triggers opening
            role: role,
            company: company,
            jd_context: jd,
            last_user_answer: "START_INTERVIEW" 
        });

        const aiText = res.data.text || "Hello! I'm ready to interview you. Tell me about yourself.";
        addMessage("ai", aiText);
        speak(aiText);
    } catch (e) {
        console.error(e);
        const fallback = "System Error: Check backend connection.";
        addMessage("ai", fallback);
    } finally {
        setIsAiThinking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;
    
    // 1. Capture User Input
    const userText = currentInput;
    addMessage("user", userText);
    setCurrentInput("");
    stopAudio();
    if (isUserSpeaking) recognition.current.stop();

    // 2. Check Limits
    const nextQCount = questionCount + 1;
    setQuestionCount(nextQCount);

    if (nextQCount > MAX_QUESTIONS) {
        await generateReport();
        return;
    }

    setIsAiThinking(true);

    try {
        // 3. Send to API
        // We filter history to keep payload size manageable if needed
        const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
        
        const res = await axios.post("/api/v1/interview/next", {
            history: historyPayload,
            last_user_answer: userText,
            role: role,
            company: company
        });

        const aiResponse = res.data.text;
        addMessage("ai", aiResponse);
        speak(aiResponse);

    } catch (e) {
        console.error(e);
        addMessage("ai", "I'm having trouble connecting to the evaluation server. Please try again.");
    } finally {
        setIsAiThinking(false);
    }
  };

  const generateReport = async () => {
      setIsAiThinking(true);
      stopAudio();
      
      try {
          // Send Full Transcript
          const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
          
          const res = await axios.post("/api/v1/interview/finalize", {
              history: historyPayload,
              role: role
          });

          setReport(res.data);
          setStatus("ANALYSIS");
      } catch (e) {
          console.error(e);
          alert("Failed to generate report.");
          onClose();
      } finally {
          setIsAiThinking(false);
      }
  };

  const addMessage = (role: "ai" | "user", content: string) => {
      setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  // --- RENDER HELPERS ---

  const renderMessageContent = (content: string) => {
    // Simple visual aid parser
    const parts = content.split(/(\[Image of.*?\])/gi);
    return parts.map((part, index) => {
      const match = part.match(/\[Image of(.*?)\]/i);
      if (match) {
        return (
          <div key={index} className="my-2 p-2 bg-indigo-900/30 border border-indigo-500/30 rounded text-xs text-indigo-200 flex items-center gap-2">
             <ImageIcon size={14} /> <span>Reference: {match[1]}</span>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  /* ---------------- VIEWS ---------------- */

  // 1. SETUP VIEW (Simplified)
  if (status === "SETUP") return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex items-center justify-center p-6">
        <InterviewSetup 
            initialRole={role}
            initialCompany={company}
            onStart={(r, c, j) => {
                setRole(r);
                setCompany(c);
                setJd(j);
                startSession();
            }}
            onCancel={onClose}
        />
    </div>
  );

  // 2. REPORT VIEW
  if (status === "ANALYSIS" && report) return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in fade-in duration-300">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
           <div className="flex items-center gap-3">
              <div className="bg-black text-white p-2 rounded-lg"><BarChart3 size={20}/></div>
              <h1 className="font-bold text-lg text-gray-900">Evaluation Report</h1>
           </div>
           <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-black">Exit</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
           <div className="max-w-4xl mx-auto space-y-6">
              {/* Score Card */}
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="45%" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                        <circle cx="50%" cy="50%" r="45%" stroke={report.overall_score > 70 ? "#10b981" : "#f59e0b"} strokeWidth="10" fill="none" strokeDasharray="283" strokeDashoffset={283 - (283 * report.overall_score) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-center">
                        <div className="text-4xl font-black">{report.overall_score}</div>
                        <div className="text-xs uppercase font-bold text-gray-400">Score</div>
                    </div>
                 </div>
                 <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">{report.decision}</h2>
                    <p className="text-gray-600 leading-relaxed">{report.summary}</p>
                 </div>
              </div>

              {/* Grid Details */}
              <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                     <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle2 className="text-green-500" size={18}/> Strengths</h3>
                     <ul className="space-y-3">
                        {report.strengths.map((s,i) => (
                            <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">•</span>{s}</li>
                        ))}
                     </ul>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                     <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Activity className="text-red-500" size={18}/> Areas to Improve</h3>
                     <ul className="space-y-3">
                        {report.weaknesses.map((w,i) => (
                            <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-500">•</span>{w}</li>
                        ))}
                     </ul>
                  </div>
              </div>
           </div>
        </div>
    </div>
  );

  // 3. ACTIVE SESSION VIEW (Default)
  return (
    <div className="fixed inset-0 z-50 bg-[#0F0F0F] flex flex-col font-sans text-white">
       
       {/* 3A. MAIN STAGE */}
       <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
          
          {/* AI Persona */}
          <div className="relative flex flex-col items-center z-10">
             {isAiSpeaking && (
                 <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[80px] opacity-20 animate-pulse" />
             )}
             <div className={`w-48 h-48 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden bg-gradient-to-b from-gray-800 to-black transition-transform duration-300 ${isAiSpeaking ? "scale-105 border-indigo-500/50" : "scale-100"}`}>
                 <Avatar style={{ width: '100%', height: '100%' }} {...aiConfig.current} />
             </div>
             
             {/* Status Badge */}
             <div className="mt-8 flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full shadow-xl">
                 {isAiThinking ? (
                     <><BrainCircuit size={16} className="text-indigo-400 animate-pulse" /> <span className="text-xs font-bold text-indigo-300">Analyzing...</span></>
                 ) : isAiSpeaking ? (
                     <><Volume2 size={16} className="text-green-400" /> <span className="text-xs font-bold text-green-400">Speaking</span></>
                 ) : (
                     <><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/> <span className="text-xs font-bold text-gray-400">Listening...</span></>
                 )}
             </div>
          </div>

          {/* Transcript Overlay (Left Side) */}
          <div className="absolute top-0 left-0 bottom-20 w-80 p-6 hidden lg:flex flex-col justify-end pointer-events-none">
              <div className="space-y-4 mask-image-linear-to-t pb-4">
                  {messages.slice(-3).map((msg) => (
                      <motion.div 
                        key={msg.timestamp} 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        className={`p-4 rounded-2xl backdrop-blur-md border shadow-lg ${msg.role === "user" ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-100 ml-8" : "bg-white/10 border-white/10 text-gray-300 mr-8"}`}
                      >
                          <div className="text-[9px] font-bold opacity-50 mb-1 uppercase tracking-wider">{msg.role === "user" ? "Candidate" : "Interviewer"}</div>
                          <div className="text-sm leading-relaxed">{renderMessageContent(msg.content)}</div>
                      </motion.div>
                  ))}
              </div>
          </div>
       </div>

       {/* 3B. CONTROL BAR */}
       <div className="h-24 bg-[#0A0A0A] border-t border-white/5 flex items-center justify-center relative px-4 z-20">
           
           <div className="flex items-center gap-6">
                <button 
                    onClick={() => setAudioEnabled(!audioEnabled)} 
                    className={`p-3 rounded-full hover:bg-white/10 transition-colors ${audioEnabled ? "text-white" : "text-red-500"}`}
                    title="Toggle Text-to-Speech"
                >
                    {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                <div className="relative">
                    {/* User Visualizer Ring */}
                    {isUserSpeaking && (
                        <span className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></span>
                    )}
                    <button 
                        onClick={toggleMic} 
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl ${isUserSpeaking ? "bg-red-600 text-white scale-110" : "bg-white text-black hover:bg-gray-200"}`}
                    >
                        {isUserSpeaking ? <div className="w-6 h-6 bg-white rounded-[2px]" /> : <Mic size={24} />}
                    </button>
                </div>

                <button 
                    onClick={() => setShowExitConfirm(true)} 
                    className="p-3 rounded-full hover:bg-white/10 text-red-500 transition-colors"
                    title="End Session"
                >
                    <LogOut size={20} />
                </button>
           </div>

           {/* Text Input Fallback */}
           <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
               <motion.div 
                 initial={{ y: 10, opacity: 0 }} 
                 animate={{ y: 0, opacity: 1 }}
                 className={`flex items-center gap-2 bg-black/80 backdrop-blur-md border rounded-full px-2 py-2 shadow-2xl transition-colors ${isUserSpeaking ? "border-red-500/50" : "border-white/10"}`}
               >
                   <div className="pl-3 text-gray-500"><Monitor size={16} /></div>
                   <input 
                      value={currentInput}
                      onChange={(e) => {
                          setCurrentInput(e.target.value);
                          if(isAiSpeaking) stopAudio();
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder={isUserSpeaking ? "Listening..." : "Type your answer..."}
                      className="flex-1 bg-transparent border-none text-white text-sm outline-none placeholder-gray-600 h-8"
                      disabled={isUserSpeaking || isAiThinking}
                   />
                   <button 
                      onClick={handleSendMessage} 
                      disabled={!currentInput.trim() || isAiThinking} 
                      className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 disabled:opacity-50 disabled:scale-90 transition-all"
                   >
                      <ArrowRight size={14} />
                   </button>
               </motion.div>
           </div>
       </div>

       {/* 3C. EXIT MODAL */}
       <AnimatePresence>
          {showExitConfirm && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
                   <AlertCircle className="mx-auto text-red-500 mb-4" size={40} />
                   <h3 className="text-lg font-bold text-white mb-2">End Interview?</h3>
                   <p className="text-gray-400 text-sm mb-6">Your progress will be lost and no report will be generated.</p>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowExitConfirm(false)} className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors">Resume</button>
                      <button onClick={onClose} className="py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors">End Session</button>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};