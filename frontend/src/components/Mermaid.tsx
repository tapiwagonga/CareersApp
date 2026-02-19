import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Initialize once
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
});

export const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          setSvg(svg);
        } catch (error) {
          console.error("Mermaid Render Failed", error);
        }
      }
    };
    renderChart();
  }, [chart]);

  return (
    <>
      {/* INLINE CARD VIEW */}
      <div className="my-6 group relative">
        <div className="bg-[#0F172A] rounded-xl overflow-hidden border border-indigo-500/30 shadow-xl relative">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              System Architecture
            </div>
            <button 
               onClick={() => setIsExpanded(true)}
               className="text-gray-400 hover:text-white transition-colors"
            >
               <Maximize2 size={14} />
            </button>
          </div>

          {/* Diagram Container */}
          <div className="p-6 flex justify-center bg-[#0F172A] overflow-x-auto">
             <div 
               ref={ref} 
               dangerouslySetInnerHTML={{ __html: svg }} 
               className="mermaid-graph"
             />
          </div>
        </div>
      </div>

      {/* EXPANDED MODAL VIEW */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setIsExpanded(false)}
          >
            <div className="absolute top-6 right-6">
                <button className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20">
                    <X size={24} />
                </button>
            </div>
            
            <motion.div 
               initial={{ scale: 0.9 }} 
               animate={{ scale: 1 }}
               className="w-full max-w-5xl bg-[#0F172A] rounded-2xl p-8 border border-gray-800 shadow-2xl overflow-auto max-h-[90vh]"
               onClick={e => e.stopPropagation()}
            >
               <div dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};