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
  role: "Software Engineer, Product Infrastructure",
  company: "Meta",
  description: `About the role:
Meta is building products that connect billions of people around the world. We are looking for a Software Engineer to design, build, and scale high-performance systems that power our core products.

What we look for:
- Strong experience with JavaScript and modern frameworks such as React.
- Proficiency in backend development using Python or Node.js.
- Solid understanding of system design, distributed systems, and scalability.
- Experience building and consuming RESTful or GraphQL APIs.
- Familiarity with databases and data modelling (SQL or NoSQL).
- Ability to write clean, efficient, and well-tested code.
- Experience working in fast-paced, cross-functional engineering teams.

Nice to have:
- Experience designing large-scale systems serving millions of users.
- Knowledge of cloud infrastructure, Docker, and Kubernetes.
- Familiarity with performance optimisation and observability tools.
- Exposure to CI/CD pipelines and DevOps practices.`
};

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group"
        type="button"
      >
        <span className="font-bold text-gray-900 group-hover:text-gray-600 transition-colors text-lg">
          {question}
        </span>
        <ChevronDown
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-black" : ""}`}
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
            <p className="pb-5 text-gray-600 text-base leading-relaxed max-w-2xl">{answer}</p>
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
        } catch {}
      };
      fetchResume();
    }
  }, [initialData, data.cvFile]);

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF document for analysis.");
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
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans selection:bg-black selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-gray-200/40 rounded-full blur-[120px] opacity-70 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-gray-300/40 rounded-full blur-[120px] opacity-70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      <div className="relative z-10 pt-16 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm backdrop-blur-md"
          >
            <Sparkles size={16} className="text-gray-900 fill-gray-900" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
              Academic Project Prototype
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tight text-gray-900 leading-[0.95]"
          >
            Find The Gaps. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-gray-800 to-gray-500">
              Build Your Skills.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            This prototype uses AI to cross reference your CV with a specific job description. It identifies exactly what technical skills you are missing and generates a custom roadmap to help you learn them.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
          className="max-w-4xl mx-auto bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-gray-900/10 border border-white p-8 md:p-14 relative overflow-hidden ring-1 ring-gray-900/5"
        >
          <div className="absolute top-0 right-0 p-8 z-20">
            <button
              onClick={handleFillDemo}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-all shadow-sm"
              type="button"
            >
              <Zap size={16} className="fill-gray-600" /> Load Sample Data
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3 group">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">
                  Target Role
                </label>
                <div className="relative">
                  <Briefcase
                    className="absolute left-5 top-5 text-gray-400 group-focus-within:text-black transition-colors"
                    size={22}
                  />
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-3xl pl-16 pr-6 py-5 font-bold text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-900/5 transition-all outline-none shadow-sm"
                    placeholder="e.g. Frontend Developer"
                    value={data.role}
                    onChange={e => setData({ ...data, role: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 group">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">
                  Company
                </label>
                <div className="relative">
                  <Building2
                    className="absolute left-5 top-5 text-gray-400 group-focus-within:text-black transition-colors"
                    size={22}
                  />
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-3xl pl-16 pr-6 py-5 font-bold text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-900/5 transition-all outline-none shadow-sm"
                    placeholder="e.g. Tech Corp"
                    value={data.company}
                    onChange={e => setData({ ...data, company: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Job Description
                </label>

                <div className="bg-gray-100 p-1.5 rounded-2xl flex relative shadow-inner">
                  <motion.div
                    className="absolute top-1.5 bottom-1.5 w-[50%] bg-white rounded-xl shadow-sm border border-gray-200"
                    animate={{ x: inputMode === "text" ? 0 : "100%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`relative z-10 flex-1 px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                      inputMode === "text" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("link")}
                    className={`relative z-10 flex-1 px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                      inputMode === "link" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <textarea
                        className="w-full h-72 bg-gray-50 border border-gray-200 rounded-3xl p-8 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-900/5 transition-all resize-none outline-none leading-relaxed shadow-sm"
                        placeholder="Paste the job description here. The AI will extract the technical requirements for you."
                        value={data.description}
                        onChange={e => setData({ ...data, description: e.target.value })}
                        required={inputMode === "text"}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="link"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        <Globe
                          className="absolute left-5 top-5 text-gray-400 group-focus-within:text-black transition-colors"
                          size={22}
                        />
                        <input
                          type="url"
                          className="w-full bg-gray-50 border border-gray-200 rounded-3xl pl-16 pr-6 py-5 font-bold text-lg text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-gray-900/5 transition-all outline-none shadow-sm"
                          placeholder="https://linkedin.com/jobs/view/..."
                          value={data.jd_url || ""}
                          onChange={e => setData({ ...data, jd_url: e.target.value })}
                          required={inputMode === "link"}
                        />
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-4 ml-3 flex items-center gap-1.5 uppercase tracking-wide">
                        <ShieldCheck size={14} className="text-black" /> Works with standard job board links.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Your CV (PDF Format)
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
                  relative border-[3px] border-dashed rounded-[2rem] p-2.5 transition-all duration-300 cursor-pointer overflow-hidden
                  ${isDragging ? "border-gray-900 bg-gray-100 scale-[1.02] shadow-xl shadow-gray-900/10" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"}
                  ${data.cvFile ? "bg-white border-black border-solid shadow-lg shadow-gray-900/5" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className={`p-8 md:p-10 rounded-3xl flex items-center gap-6 transition-all ${data.cvFile ? "bg-gray-50" : ""}`}>
                  <div
                    className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-colors ${
                      data.cvFile
                        ? "bg-black text-white shadow-xl shadow-gray-900/20"
                        : "bg-white border border-gray-200 text-gray-400 shadow-sm"
                    }`}
                  >
                    {data.cvFile ? <FileCheck size={32} strokeWidth={2.5} /> : <Upload size={32} strokeWidth={2.5} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {data.cvFile ? (
                      <>
                        <p className="font-black text-gray-900 text-xl truncate tracking-tight">{data.cvFile.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-2.5 h-2.5 bg-black rounded-full animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                          <p className="text-[11px] text-gray-700 font-bold uppercase tracking-widest">
                            Document Attached
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-black text-gray-900 text-xl group-hover:text-black transition-colors tracking-tight">
                          Upload CV (PDF)
                        </p>
                        <p className="text-sm font-medium text-gray-500 mt-2 leading-relaxed">
                          We will extract your skills to compare against the requirements.
                        </p>
                      </>
                    )}
                  </div>

                  {data.cvFile && (
                    <button
                      onClick={removeFile}
                      className="p-4 bg-white rounded-2xl border border-gray-200 text-gray-500 hover:text-black hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                      type="button"
                    >
                      <X size={24} strokeWidth={2.5} />
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
              className="w-full bg-black text-white font-bold text-xl py-6 rounded-3xl shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:bg-gray-900 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-4 group relative overflow-hidden tracking-wide"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              <div className="relative flex items-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={28} />
                    <span>Analysing Data...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Gap Analysis</span>
                    <ArrowRight size={28} strokeWidth={2.5} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </>
                )}
              </div>
            </button>
          </form>
        </motion.div>

        <div className="mt-16 text-center opacity-70">
          {/* <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-6">
            Technologies Used
          </p> */}
          {/* <div className="flex justify-center gap-10 grayscale opacity-60">
            <span className="font-bold text-2xl text-gray-400 font-serif tracking-tight">Gemini AI</span>
            <span className="font-bold text-2xl text-gray-400 font-serif tracking-tight">React</span>
            <span className="font-bold text-2xl text-gray-400 font-serif tracking-tight">FastAPI</span>
            <span className="font-bold text-2xl text-gray-400 font-serif tracking-tight">Python</span>
          </div> */}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 py-32 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
              How the System <br /> Actually Works.
            </h2>
            <div className="space-y-6 text-lg text-gray-600 font-medium leading-relaxed">
              <p>
                This application demonstrates how Large Language Models can structure qualitative data. We take two pieces of unstructured text and compute the differences.
              </p>
              <p>It goes beyond simple keyword matching to understand semantic context, providing a realistic breakdown of technical capabilities.</p>
            </div>

            <div className="mt-10 p-8 bg-gray-50 rounded-[2rem] border-l-4 border-black shadow-inner">
              <p className="text-gray-900 font-bold text-lg italic leading-relaxed">
                The final output is a step by step curriculum generated in real time to address the exact deficiencies identified during the analysis.
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {[
              {
                icon: <Target className="text-black" size={24} strokeWidth={2.5} />,
                title: "Extract Requirements",
                desc: "We parse the job description to find the exact tools and frameworks required.",
                bg: "bg-gray-100",
                border: "border-gray-200"
              },
              {
                icon: <TrendingUp className="text-black" size={24} strokeWidth={2.5} />,
                title: "Analyse Gaps",
                desc: "We compare your CV to the job description to visualise exactly what you are missing.",
                bg: "bg-gray-100",
                border: "border-gray-200"
              },
              {
                icon: <BookOpen className="text-black" size={24} strokeWidth={2.5} />,
                title: "Generate Curriculum",
                desc: "The system builds a step by step study plan to help you learn the missing skills.",
                bg: "bg-gray-100",
                border: "border-gray-200"
              }
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-6 p-6 rounded-[2rem] bg-white border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-300 group cursor-default"
              >
                <div className={`w-16 h-16 rounded-2xl shadow-sm border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${item.bg} ${item.border}`}>
                  {item.icon}
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-gray-900 text-xl mb-2 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="py-12 text-center bg-gray-50 border-t border-gray-200">
        <p className="text-gray-500 text-sm font-bold tracking-wide uppercase">© 2026 Academic Research Prototype. Designed for educational use.</p>
      </footer>
    </div>
  );
};