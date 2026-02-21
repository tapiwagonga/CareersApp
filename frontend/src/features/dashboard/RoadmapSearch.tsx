import React, { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";

type SearchItem = {
  label: string;
  phaseIndex: number;
  taskKey: string;
  taskTitle: string;
  taskType?: string;
  isDone?: boolean;
};

export const RoadmapSearch = ({
  items,
  onSelect
}: {
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
}) => {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return items
      .filter(x => {
        const hay = `${x.taskTitle} ${x.taskType ?? ""} ${x.label}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 10);
  }, [q, items]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
          <Search size={16} />
        </div>

        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search tasks, docs, projects"
          className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {results.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          {results.map(r => (
            <button
              key={`${r.phaseIndex}:${r.taskKey}`}
              type="button"
              onClick={() => {
                onSelect(r);
                setQ("");
              }}
              className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-black hover:shadow-sm transition-all group bg-gray-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-500 truncate">{r.label}</div>
                  <div className="text-sm font-bold text-gray-900 truncate">{r.taskTitle}</div>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-gray-400 group-hover:text-black transition-colours">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Open</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};