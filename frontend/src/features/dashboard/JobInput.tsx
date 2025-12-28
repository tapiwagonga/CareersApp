import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Briefcase, 
  Link, 
  FileText, 
  Upload, 
  ArrowRight, 
  Check, 
  Search,
  BookOpen,
  TrendingUp,
  X
} from "lucide-react";

interface JobData {
  company: string;
  role: string;
  description: string; 
  cvFile: File | null;
}

interface Props {
  onSubmit: (data: JobData) => void;
  isLoading?: boolean;
}

export const JobInput = ({ onSubmit, isLoading = false }: Props) => {
  const [data, setData] = useState<JobData>({ company: "", role: "", description: "", cvFile: null });
  const [inputMode, setInputMode] = useState<"link" | "text">("text");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };
  const validateAndSetFile = (file: File) => {
    file.type === "application/pdf" ? setData(prev => ({ ...prev, cvFile: file })) : alert("Please upload a PDF.");
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };
  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation(); setData(prev => ({ ...prev, cvFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (data.role && data.description) onSubmit(data);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <div className="relative pt-24 pb-32 px-6 overflow-hidden bg-gray-50/50 border-b border-gray-100">
        {/* Subtle Neutral Background Art */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-[30%] -right-[10%] w-[800px] h-[800px] bg-gray-100/80 rounded-full blur-[120px]" />
          {/* FIXED: Changed blue blob to neutral gray */}
          <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-stone-100/60 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-serif font-medium tracking-tighter text-gray-900 leading-[1] mb-8">
              Don't just apply. <br />
              <span className="italic text-gray-400">Prepare.</span>
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto font-light">
              Stop guessing what skills you need. We analyze the job description to build you a custom learning plan, so you can walk into the interview with confidence.
            </p>
          </motion.div>

          {/* --- THE MAIN FORM CARD --- */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/40 border border-gray-200/80 p-8 md:p-12 text-left mt-16 relative overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
              
              {/* Row 1: Role & Company */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-widest">Target Role</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="e.g. Senior Product Designer" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 transition-all text-lg outline-none"
                      value={data.role} 
                      onChange={e => setData({...data, role: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-widest">Company (Optional)</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="e.g. Airbnb" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 transition-all text-lg outline-none"
                      value={data.company} 
                      onChange={e => setData({...data, company: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Description Source */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 uppercase tracking-widest">Job Requirements</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setInputMode("text")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${inputMode === "text" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><FileText size={14}/> Paste Text</button>
                    <button type="button" onClick={() => setInputMode("link")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${inputMode === "link" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"}`}><Link size={14}/> Link URL</button>
                  </div>
                </div>

                <div className="relative group">
                   <AnimatePresence mode="wait">
                    {inputMode === "text" ? (
                      <motion.div key="text" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                        <textarea 
                          placeholder="Paste the full job description here..." 
                          className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-5 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 transition-all resize-none text-base leading-relaxed outline-none custom-scrollbar"
                          value={data.description} 
                          onChange={e => setData({...data, description: e.target.value})}
                          required={inputMode === "text"}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="link" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                        <div className="relative">
                          <Link className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                          <input 
                            type="url" 
                            placeholder="https://linkedin.com/jobs/..." 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black/5 transition-all text-lg font-medium outline-none"
                            value={data.description} 
                            onChange={e => setData({...data, description: e.target.value})}
                            required={inputMode === "link"}
                          />
                        </div>
                      </motion.div>
                    )}
                   </AnimatePresence>
                </div>
              </div>

              {/* Row 3: Resume (Optional) */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                // FIXED: Removed blue drag state, changed to high-contrast black/gray
                className={`
                  group border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all flex items-center justify-center gap-4
                  ${isDragging ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"}
                  ${data.cvFile ? "bg-gray-50 border-gray-300 border-solid" : ""}
                `}
              >
                 <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                 
                 {data.cvFile ? (
                   <div className="flex items-center gap-4 w-full">
                     <div className="bg-black p-2 rounded-full text-white"><Check size={18} /></div>
                     <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-gray-900 truncate">{data.cvFile.name}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ready for Analysis</p>
                     </div>
                     <button onClick={removeFile} className="px-3 py-1 text-xs font-bold border border-gray-300 rounded hover:bg-gray-200 hover:text-black transition-colors">CHANGE</button>
                   </div>
                 ) : (
                   <>
                     <div className="bg-gray-100 p-3 rounded-full text-gray-400 group-hover:text-black group-hover:bg-white transition-colors">
                       <Upload size={24} />
                     </div>
                     <div className="text-center md:text-left">
                       <p className="font-bold text-gray-900 text-lg">Upload Resume (PDF)</p>
                       <p className="text-sm text-gray-500">Optional. We'll compare your current skills.</p>
                     </div>
                   </>
                 )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !data.role || !data.description}
                className="w-full bg-black hover:bg-gray-900 text-white font-bold text-lg py-5 rounded-xl shadow-xl hover:shadow-2xl transform transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <span>Create My Learning Plan</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

            </form>
          </motion.div>

        </div>
      </div>

      {/* --- WHY USE THIS TOOL? (The Pitch) --- */}
      <div className="py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          
          <div className="grid md:grid-cols-2 gap-20 items-center mb-32">
            <div>
              <h2 className="text-5xl md:text-6xl font-serif font-medium mb-8 text-gray-900 leading-tight">
                Stop applying in the dark.
              </h2>
              <p className="text-xl text-gray-600 font-light leading-relaxed mb-8">
                Most job descriptions are vague wishlists. Applying without understanding the *real* requirements is a waste of time. 
              </p>
              <p className="text-xl text-gray-900 font-medium leading-relaxed border-l-4 border-black pl-6">
                This tool acts as your personal career strategist. It reads between the lines, finds the gaps in your resume, and gives you a concrete plan to fix them.
              </p>
            </div>
            <div className="bg-gray-50 p-10 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="space-y-8">
                 <div className="flex items-start gap-5">
                    <div className="bg-white p-3 rounded-full text-gray-400 border border-gray-100 mt-1"><X size={24}/></div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">The Old Way</h4>
                      <p className="text-gray-600 text-base leading-relaxed">Guessing what "Good knowledge of React" means and randomly watching 20 hours of tutorials that might not even be relevant.</p>
                    </div>
                 </div>
                 <div className="h-px bg-gray-200 w-full" />
                 <div className="flex items-start gap-5">
                    <div className="bg-black p-3 rounded-full text-white mt-1"><Check size={24}/></div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">The New Way</h4>
                      <p className="text-gray-600 text-base leading-relaxed">Getting a precise directive: "Learn React Hooks and Context API because this role specifically requires complex state management."</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* --- HOW IT WORKS (3 Steps) --- */}
          <div className="text-center mb-20">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">The Process</h3>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-gray-900">How we bridge the gap</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            
            {/* Step 1 */}
            <div className="text-center md:text-left group">
              <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-8 mx-auto md:mx-0 group-hover:bg-black group-hover:text-white transition-all duration-300 shadow-sm">
                <Search size={36} strokeWidth={1.5} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">1. We Analyze</h4>
              <p className="text-gray-600 text-lg leading-relaxed font-light">
                We scan the job description to find the technical skills and soft skills that actually matter, prioritizing them by importance.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center md:text-left group">
              <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-8 mx-auto md:mx-0 group-hover:bg-black group-hover:text-white transition-all duration-300 shadow-sm">
                <TrendingUp size={36} strokeWidth={1.5} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">2. You Compare</h4>
              <p className="text-gray-600 text-lg leading-relaxed font-light">
                You rate your current confidence level for each skill. We visualize exactly how far you are from the "Perfect Candidate" profile.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center md:text-left group">
              <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-8 mx-auto md:mx-0 group-hover:bg-black group-hover:text-white transition-all duration-300 shadow-sm">
                <BookOpen size={36} strokeWidth={1.5} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">3. You Learn</h4>
              <p className="text-gray-600 text-lg leading-relaxed font-light">
                We generate a tailored list of resources (docs, videos, articles) specifically chosen to close your gaps in the shortest time possible.
              </p>
            </div>

          </div>

        </div>
      </div>
      
    </div>
  );
};