import React, { useState } from "react";
import { ExternalLink, BookOpen, PlayCircle, Terminal, Award, Bookmark } from "lucide-react";
import { Resource } from "../../types";



const typeConfig = {
  Video: { icon: <PlayCircle size={16} />, color: "text-blue-400 bg-blue-900/20" },
  Course: { icon: <Award size={16} />, color: "text-purple-400 bg-purple-900/20" },
  Documentation: { icon: <BookOpen size={16} />, color: "text-slate-400 bg-slate-800" },
  Interactive: { icon: <Terminal size={16} />, color: "text-amber-400 bg-amber-900/20" },
};

export const ResourceCard = ({ resource }: { resource: Resource }) => {
  const [isSaved, setIsSaved] = useState(false);
  const isOfficial = resource.authority_tier === 1;
  const config = (typeConfig as any)[resource.media_type] || typeConfig.Documentation;

  return (
    <div className="group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1">
      
      {/* Icon Column */}
      <div className="shrink-0">
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${config.color}`}>
          {config.icon}
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-semibold text-slate-200 truncate pr-4 group-hover:text-emerald-400 transition-colors">
            {resource.title}
          </h4>
          
          {/* Action Buttons */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className={`hover:text-emerald-400 transition-colors ${isSaved ? "text-emerald-500 fill-emerald-500" : "text-slate-500"}`}
            >
              <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
            </button>
            <a href={resource.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
          {isOfficial && (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/50">
              <Award size={10} /> Official
            </span>
          )}
          <span className="font-medium text-slate-400">{resource.provider}</span>
          <span>•</span>
          <span className="font-mono">{resource.duration}</span>
        </div>
      </div>
    </div>
  );
};