import React, { useState } from "react";
import ReactPlayer from 'react-player'// Run: npm install react-player
import { 
  PlayCircle, BookOpen, Code, CheckCircle2, 
  Lock, Calendar, ChevronRight, ExternalLink 
} from "lucide-react";
import { AnalysisResult, RoadmapTask } from "../../types.ts";

interface Props {
  data: AnalysisResult;
  onReset: () => void;
}

export const Dashboard = ({ data, onReset }: Props) => {
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeTask, setActiveTask] = useState<RoadmapTask | null>(null);

  const currentWeek = data.roadmap.find(w => w.week_number === activeWeek) || data.roadmap[0];

  // Logic to handle "Watch" links that might just be search queries
  const getPlayableUrl = (url?: string) => {
    if (!url) return "";
    if (url.includes("http")) return url;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans flex flex-col md:flex-row">
      
      {/* --- SIDEBAR: The Syllabus --- */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 h-auto md:h-screen overflow-y-auto sticky top-0">
        <div className="p-6 border-b border-gray-100 bg-white z-10 sticky top-0">
           <h2 className="font-serif font-bold text-xl tracking-tight">Curriculum</h2>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
             {data.roadmap.length} Week Bootcamp
           </p>
        </div>
        
        <div className="p-4 space-y-2">
          {data.roadmap.map((week) => {
            const isActive = activeWeek === week.week_number;
            return (
              <div 
                key={week.week_number}
                onClick={() => setActiveWeek(week.week_number)}
                className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200
                  ${isActive ? "bg-black text-white border-black shadow-lg transform scale-105" : "bg-white border-gray-100 hover:border-gray-300 text-gray-600"}
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-gray-400" : "text-gray-400"}`}>
                    Week {week.week_number}
                  </span>
                  {isActive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                </div>
                <h3 className={`font-bold text-sm leading-tight ${isActive ? "text-white" : "text-gray-900"}`}>
                   {week.focus_area}
                </h3>
                <div className="mt-3 text-[10px] opacity-70 flex gap-3">
                   <span className="flex items-center gap-1"><PlayCircle size={10}/> {week.tasks.filter(t => t.type === 'Watch').length}</span>
                   <span className="flex items-center gap-1"><Code size={10}/> {week.tasks.filter(t => t.type === 'Build').length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* --- MAIN CONTENT: The Learning Center --- */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* Week Header */}
        <header className="mb-8">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">
              <Calendar size={12} /> Current Sprint
           </div>
           <h1 className="text-4xl font-serif font-bold mb-2 text-gray-900">{currentWeek.label}</h1>
           <p className="text-gray-500 max-w-2xl text-lg">{currentWeek.description}</p>
        </header>

        {/* --- ACTIVE TASK VIEWER (If Video) --- */}
        {activeTask && activeTask.type === "Watch" && (
            <div className="mb-10 bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video relative group">
                <ReactPlayer 
                   src={getPlayableUrl(activeTask.meta.url)} 
                   width="100%" 
                   height="100%" 
                   controls 
                   playing
                />
                <button 
                  onClick={() => setActiveTask(null)}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold transition-all"
                >
                  Close Player
                </button>
            </div>
        )}

        {/* --- TASK GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            
            {/* COLUMN 1: CONSUME (Watch & Read) */}
            <div className="space-y-6">
               <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Learn Concepts</h3>
               
               {currentWeek.tasks.filter(t => t.type === 'Watch' || t.type === 'Read').map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => task.type === 'Watch' ? setActiveTask(task) : window.open(getPlayableUrl(task.meta.url), '_blank')}
                    className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
                  >
                     <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 
                        ${task.type === 'Watch' ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'} transition-colors`}>
                        {task.type === 'Watch' ? <PlayCircle size={24} /> : <BookOpen size={24} />}
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                           <span>{task.estimated_minutes} Min</span>
                           <span>•</span>
                           <span>{task.meta.platform}</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            {/* COLUMN 2: PRODUCE (Build & Practice) */}
            <div className="space-y-6">
               <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Apply Skills</h3>
               
               {currentWeek.tasks.filter(t => t.type === 'Build').map((task) => (
                  <div key={task.id} className="bg-gray-900 text-white p-6 rounded-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                     
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">
                           <Code size={14} /> Capstone Project
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-2">{task.title}</h3>
                        <p className="text-gray-400 text-sm mb-6">{task.description}</p>
                        
                        <a 
                           href={task.meta.url} 
                           target="_blank" 
                           rel="noreferrer"
                           className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                        >
                           Start Coding <ExternalLink size={14} />
                        </a>
                     </div>
                  </div>
               ))}
            </div>

        </div>

      </main>
    </div>
  );
};