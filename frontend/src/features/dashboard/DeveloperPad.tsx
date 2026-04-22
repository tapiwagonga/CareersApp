import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, Bold, Italic, Underline, Code,
  Calculator
} from "lucide-react";

interface DeveloperPadProps {
  isOpen: boolean;
  onClose: () => void;
  activePhaseIndex: number;
  activePhaseName: string;
  notes: string;
  onNoteChange: (text: string) => void;
}

export const DeveloperPad = ({
  isOpen,
  onClose,
  activePhaseIndex,
  activePhaseName,
  notes,
  onNoteChange
}: DeveloperPadProps) => {

  const [activeTab, setActiveTab] = useState<'notebook' | 'tools' | 'tutor'>('notebook');
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // -------------------------
  // INLINE AI STATE (NEW)
  // -------------------------
  const [selection, setSelection] = useState({
    text: "",
    start: 0,
    end: 0,
    visible: false,
    x: 0,
    y: 0
  });
  const [aiLoading, setAiLoading] = useState(false);

  // -------------------------
  // EXISTING STATE
  // -------------------------
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [calc, setCalc] = useState("");

  const wordCount = notes.trim().split(/\s+/).filter(Boolean).length;
  const codeFence = "\u0060\u0060\u0060";

  // -------------------------
  // SELECTION HANDLER (NEW)
  // -------------------------
  const handleSelection = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) {
      setSelection(prev => ({ ...prev, visible: false }));
      return;
    }

    const rect = el.getBoundingClientRect();

    setSelection({
      text: notes.slice(start, end),
      start,
      end,
      visible: true,
      x: rect.left + 120,
      y: rect.top + 40
    });
  };

  // -------------------------
  // INLINE INSERT (NEW)
  // -------------------------
  const insertInline = (content: string, label: string) => {
    const block = `

> 💡 **${label}**
> ${content.replace(/\n/g, "\n> ")}

`;

    const newText =
      notes.slice(0, selection.end) +
      block +
      notes.slice(selection.end);

    onNoteChange(newText);
    setSelection(prev => ({ ...prev, visible: false }));
  };

  // -------------------------
  // INLINE AI CALL (NEW)
  // -------------------------
  const runInlineAI = async (type: "explain" | "summarise") => {
    setAiLoading(true);

    try {
      const res = await fetch(`/api/v1/notes/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: selection.text })
      });

      const data = await res.json();

      if (type === "explain") {
        insertInline(data.explanation, "Explanation");
      } else {
        insertInline(data.summary, "Summary");
      }

    } catch {
      insertInline("AI request failed", "Error");
    }

    setAiLoading(false);
  };

  // -------------------------
  // MARKDOWN
  // -------------------------
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: "<p class='text-slate-400'>No notes</p>" };

    const html = text
      .replace(/```([\s\S]*?)```/g, `<pre class="bg-black text-white p-3 rounded overflow-x-auto"><code>$1</code></pre>`)
      .replace(/`([^`]+)`/g, `<code class="bg-gray-200 px-1 rounded">$1</code>`)
      .replace(/\*\*(.*?)\*\*/g, `<strong>$1</strong>`)
      .replace(/\*(.*?)\*/g, `<em>$1</em>`)
      .replace(/\n/g, "<br/>");

    return { __html: html };
  };

  const insertFormat = (before: string, after: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    const newText =
      notes.slice(0, start) +
      before +
      notes.slice(start, end) +
      after +
      notes.slice(end);

    onNoteChange(newText);
  };

  // -------------------------
  // EXISTING AI (UNCHANGED)
  // -------------------------
  const callAI = async (type: 'explain' | 'summarise' | 'ask') => {
    setLoading(true);
    setAiResult(null);

    try {
      let res;

      if (type === 'ask') {
        res = await fetch("/api/v1/notes/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, question })
        });
      } else {
        res = await fetch(`/api/v1/notes/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes })
        });
      }

      const data = await res.json();
      setAiResult(data);

    } catch {
      setAiResult({ error: "AI request failed" });
    }

    setLoading(false);
  };

  const renderAI = () => {
    if (!aiResult) return null;
    if (aiResult.error) return <p className="text-red-500 text-sm">{aiResult.error}</p>;

    if (aiResult.explanation) {
      return (
        <div>
          <p>{aiResult.explanation}</p>
          <ul className="list-disc ml-5">
            {aiResult.key_points?.map((p: string, i: number) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      );
    }

    if (aiResult.summary) {
      return (
        <ul className="list-disc ml-5">
          {aiResult.bullets?.map((b: string, i: number) => <li key={i}>{b}</li>)}
        </ul>
      );
    }

    if (aiResult.answer) {
      return <p>{aiResult.answer}</p>;
    }

    return null;
  };

  // -------------------------
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white shadow-2xl z-50 flex flex-col">

          {/* HEADER */}
          <div className="bg-black text-white p-4 flex justify-between">
            <div>
              <h3 className="font-bold">Developer Pad</h3>
              <p className="text-xs text-gray-400">{activePhaseName}</p>
            </div>
            <button onClick={onClose}><X /></button>
          </div>

          {/* TABS */}
          <div className="flex border-b text-xs font-semibold">
            {["notebook","tools","tutor"].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-3 ${activeTab === t ? "border-b-2 border-black" : "text-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* NOTEBOOK */}
            {activeTab === "notebook" && (
              <div className="p-4 flex flex-col h-full relative">

                <textarea
                  ref={textareaRef}
                  value={notes}
                  onChange={(e) => onNoteChange(e.target.value)}
                  onMouseUp={handleSelection}
                  onKeyUp={handleSelection}
                  className="flex-1 p-3 border rounded font-mono text-sm"
                />

                {/* INLINE AI TOOLBAR */}
                {selection.visible && (
                  <div
                    className="absolute bg-black text-white text-xs rounded flex gap-2 px-2 py-1"
                    style={{ top: selection.y, left: selection.x }}
                  >
                    {aiLoading ? "..." : (
                      <>
                        <button onClick={() => runInlineAI("explain")}>Explain</button>
                        <button onClick={() => runInlineAI("summarise")}>Summarise</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TOOLS */}
            {activeTab === "tools" && (
              <div className="p-4">
                <input value={calc} onChange={(e)=>setCalc(e.target.value)} className="w-full p-2 border rounded mb-2 font-mono"/>
                <button onClick={()=>{}} className="w-full bg-black text-white py-2 rounded">Execute</button>
              </div>
            )}

            {/* TUTOR */}
            {activeTab === "tutor" && (
              <div className="p-4 space-y-4">
                <button onClick={() => callAI('explain')} className="w-full bg-black text-white py-2 rounded">Explain</button>
                <div className="border p-3">{loading ? "Thinking..." : renderAI()}</div>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};