import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Briefcase,
  Upload,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Globe,
  X,
  FileCheck,
  ShieldCheck,
  Target,
  TrendingUp,
  BookOpen,
  Zap
} from "lucide-react";

export interface JobData {
  company: string;
  role: string;
  description: string;
  jd_url?: string;
  cvFile: File | null;
}

interface Props {
  initialData?: JobData | null;
  onSubmit: (data: JobData) => void;
  isLoading?: boolean;
}

const MOCK_TEXT = {
  role: "Senior Product Designer",
  company: "Linear",
  description: `About the role:
Linear is the issue tracker for modern software teams. We are looking for a Senior Product Designer to help us design the future of high-performance tools.

What we look for:
- 5+ years of experience designing complex web applications.
- Deep understanding of interaction design and visual polish.
- Proficiency in Figma, Prototyping, and Design Systems.
- Ability to write front-end code (CSS/React) is a major plus.
- Experience working in a remote-first, async environment.
- A portfolio demonstrating clear problem-solving and craft.`
};

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group"
        type="button"
      >
        <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">
          {question}
        </span>
        <ChevronDown
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-600" : ""}`}
          size={20}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-500 text-base leading-relaxed max-w-2xl">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const JobInput = ({ initialData, onSubmit, isLoading = false }: Props) => {
  const [data, setData] = useState<JobData>(
    initialData || { ...MOCK_TEXT, cvFile: null, jd_url: "" }
  );
  const [inputMode, setInputMode] = useState<"link" | "text">("text");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialData && !data.cvFile) {
      const fetchResume = async () => {
        try {
          const response = await fetch("/resume.pdf");
          if (!response.ok) return;
          const blob = await response.blob();
          const file = new File([blob], "resume.pdf", { type: "application/pdf" });
          setData(prev => ({ ...prev, cvFile: file }));
        } catch {
        }
      };
      fetchResume();
    }
  }, [initialData, data.cvFile]);

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF.");
      return;
    }
    setData(prev => ({ ...prev, cvFile: file }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setData(prev => ({ ...prev, cvFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hasText = Boolean(data.description?.trim());
    const hasUrl = Boolean(data.jd_url?.trim());

    if (!data.role?.trim()) return;

    if (inputMode === "text") {
      if (!hasText) return;
      if (hasUrl) setData(prev => ({ ...prev, jd_url: "" }));
    }

    if (inputMode === "link") {
      if (!hasUrl) return;
      if (hasText) setData(prev => ({ ...prev, description: "" }));
    }

    const payload: JobData = {
      company: data.company,
      role: data.role,
      description: inputMode === "text" ? data.description : "",
      jd_url: inputMode === "link" ? data.jd_url : "",
      cvFile: data.cvFile
    };

    onSubmit(payload);
  };

  const handleFillDemo = async () => {
    setData(prev => ({ ...prev, ...MOCK_TEXT }));

    if (!data.cvFile) {
      try {
        const response = await fetch("/resume.pdf");
        if (!response.ok) return;
        const blob = await response.blob();
        const file = new File([blob], "resume.pdf", { type: "application/pdf" });
        setData(prev => ({ ...prev, cvFile: file }));
      } catch {
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans selection:bg-black selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px] opacity-70 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] opacity-70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150" />
      </div>

      <div className="relative z-10 pt-16 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm backdrop-blur-md"
          >
            <Sparkles size={14} className="text-indigo-500 fill-indigo-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
              AI Career Architect v2.0
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif font-medium tracking-tight text-gray-900 leading-[0.95]"
          >
            Stop Guessing. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 italic">
              Start Hired.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed"
          >
            Most applications fail because they miss the unspoken requirements.
            We use AI to decode the job description and build you a{" "}
            <span className="font-semibold text-black">precision-engineered</span>{" "}
            roadmap to the offer.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
          className="max-w-4xl mx-auto bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 border border-white p-8 md:p-12 relative overflow-hidden ring-1 ring-gray-900/5"
        >
          <div className="absolute top-0 right-0 p-6 z-20">
            <button
              onClick={handleFillDemo}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
              type="button"
            >
              <Zap size={14} className="fill-indigo-500" /> Auto-Fill Demo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3 group">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Target Role
                </label>
                <div className="relative">
                  <Briefcase
                    className="absolute left-5 top-5 text-gray-300 group-focus-within:text-black transition-colors"
                    size={20}
                  />
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-14 pr-6 py-5 font-medium text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 transition-all outline-none"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={data.role}
                    onChange={e => setData({ ...data, role: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 group">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Company
                </label>
                <div className="relative">
                  <Building2
                    className="absolute left-5 top-5 text-gray-300 group-focus-within:text-black transition-colors"
                    size={20}
                  />
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-14 pr-6 py-5 font-medium text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 transition-all outline-none"
                    placeholder="e.g. Netflix"
                    value={data.company}
                    onChange={e => setData({ ...data, company: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  The Wishlist
                </label>

                <div className="bg-gray-100 p-1 rounded-xl flex relative">
                  <motion.div
                    className="absolute top-1 bottom-1 w-[50%] bg-white rounded-lg shadow-sm border border-gray-200"
                    animate={{ x: inputMode === "text" ? 0 : "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`relative z-10 flex-1 px-5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      inputMode === "text" ? "text-black" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("link")}
                    className={`relative z-10 flex-1 px-5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      inputMode === "link" ? "text-black" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Link URL
                  </button>
                </div>
              </div>

              <div className="relative group">
                <AnimatePresence mode="wait">
                  {inputMode === "text" ? (
                    <motion.div
                      key="text"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <textarea
                        className="w-full h-64 bg-gray-50 border border-gray-200 rounded-2xl p-6 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 transition-all resize-none outline-none leading-relaxed custom-scrollbar"
                        placeholder="Paste the entire job description here. Do not worry about formatting, our AI parses it."
                        value={data.description}
                        onChange={e => setData({ ...data, description: e.target.value })}
                        required={inputMode === "text"}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="link"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <div className="relative">
                        <Globe
                          className="absolute left-5 top-5 text-gray-300 group-focus-within:text-black transition-colors"
                          size={20}
                        />
                        <input
                          type="url"
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-14 pr-6 py-5 font-medium text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-100 transition-all outline-none"
                          placeholder="https://linkedin.com/jobs/view/..."
                          value={data.jd_url || ""}
                          onChange={e => setData({ ...data, jd_url: e.target.value })}
                          required={inputMode === "link"}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 ml-2 flex items-center gap-1">
                        <ShieldCheck size={12} /> Works with LinkedIn, Indeed, Greenhouse, and Lever.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Your Resume (For Gap Analysis)
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-2xl p-2 transition-all duration-300 cursor-pointer overflow-hidden
                  ${isDragging ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
                  ${data.cvFile ? "bg-white border-green-200 border-solid" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className={`p-6 md:p-8 rounded-xl flex items-center gap-6 transition-all ${data.cvFile ? "bg-green-50/40" : ""}`}>
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      data.cvFile
                        ? "bg-green-500 text-white shadow-lg shadow-green-200"
                        : "bg-white border border-gray-200 text-gray-300 shadow-sm"
                    }`}
                  >
                    {data.cvFile ? <FileCheck size={28} /> : <Upload size={28} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {data.cvFile ? (
                      <>
                        <p className="font-bold text-gray-900 text-lg truncate">{data.cvFile.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <p className="text-xs text-green-700 font-bold uppercase tracking-wider">
                            Ready for Deep Scan
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                          Upload Resume (PDF)
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          We compare your skills against the job requirements.
                        </p>
                      </>
                    )}
                  </div>

                  {data.cvFile && (
                    <button
                      onClick={removeFile}
                      className="p-3 bg-white rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !data.role?.trim() ||
                (inputMode === "text" ? !data.description?.trim() : !data.jd_url?.trim())
              }
              className="w-full bg-black text-white font-bold text-xl py-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-900 hover:-translate-y-1 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-4 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    <span>Analysing Intelligence...</span>
                  </>
                ) : (
                  <>
                    <span>Reveal My Gaps & Build Strategy</span>
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>
        </motion.div>

        <div className="mt-12 text-center opacity-60">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Trusted by candidates applying to
          </p>
          <div className="flex justify-center gap-8 grayscale opacity-50">
            <span className="font-bold text-xl text-gray-500 font-serif">Google</span>
            <span className="font-bold text-xl text-gray-500 font-serif">Stripe</span>
            <span className="font-bold text-xl text-gray-500 font-serif">Airbnb</span>
            <span className="font-bold text-xl text-gray-500 font-serif">Netflix</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 py-32 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-5xl font-serif font-medium text-gray-900 mb-8 leading-tight">
              The Black Box of <br /> Hiring is Broken.
            </h2>
            <div className="space-y-6 text-lg text-gray-600 font-light leading-relaxed">
              <p>
                75% of resumes are rejected by ATS bots before a human ever sees them. This happens due to missing
                keywords or mismatched skill definitions.
              </p>
              <p>Even if you pass the bot, you walk into the interview guessing what they actually care about.</p>
            </div>

            <div className="mt-10 p-6 bg-gray-50 rounded-2xl border-l-4 border-indigo-500">
              <p className="text-gray-900 font-medium text-lg italic">
                SkillGap gives you X-Ray vision. It shows you exactly what the hiring manager is looking for, so you can
                tailor your prep and walk in as the perfect candidate.
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {[
              {
                icon: <Target className="text-indigo-500" />,
                title: "Precision Targeting",
                desc: "We parse the JD to extract specific toolchains."
              },
              {
                icon: <TrendingUp className="text-green-500" />,
                title: "Gap Analysis",
                desc: "We visualise the delta between your resume and the role requirements."
              },
              {
                icon: <BookOpen className="text-blue-500" />,
                title: "Curated Upskilling",
                desc: "Get a custom curriculum of docs and videos to fill those gaps."
              }
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-6 p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl mb-1">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="py-12 text-center bg-white border-t border-gray-100">
        <p className="text-gray-400 text-sm font-medium">© 2026 SkillGap AI. Build the career you deserve.</p>
      </footer>
    </div>
  );
};
