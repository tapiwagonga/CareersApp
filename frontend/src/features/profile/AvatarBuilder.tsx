import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Avatar, { genConfig, type AvatarConfig } from "react-nice-avatar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shuffle, User, Smile, Scissors, Glasses, Shirt, Download, Check, X } from "lucide-react";

const OPTIONS = {
  base: {
    faceColor: ["#F9C9B6", "#AC6651", "#FFEDEF", "#A47539", "#8C5A2B", "#E0B891", "#F5D6A1"],
    earSize: ["small", "big"] as const,
    bgColor: ["#E0DDFF", "#D2EFF3", "#FFEDEF", "#FFEBA4", "#FFFFFF", "#F0F0F0", "#C8FCEA", "#FFC8DD"]
  },
  hair: {
    hairStyle: ["normal", "thick", "mohawk", "womanLong", "womanShort"] as const,
    hatStyle: ["none", "beanie", "turban"] as const,
    hairColor: ["#000000", "#4A312C", "#F5563D", "#FFF5B9", "#D6D6D6", "#506AF4", "#FF4081"]
  },
  face: {
    eyeStyle: ["circle", "oval", "smile"] as const,
    glassesStyle: ["none", "round", "square"] as const,
    noseStyle: ["short", "long", "round"] as const,
    mouthStyle: ["laugh", "smile", "peace"] as const
  },
  clothes: {
    shirtStyle: ["hoody", "short", "polo"] as const,
    shirtColor: ["#9287FF", "#6BD9E9", "#FC909F", "#F4D150", "#77311D", "#FFFFFF", "#000000"]
  }
};

type Tab = "base" | "hair" | "face" | "clothes";

const TABS: Array<{ id: Tab; label: string; icon: any }> = [
  { id: "base", label: "Skin and Bg", icon: User },
  { id: "hair", label: "Hair", icon: Scissors },
  { id: "face", label: "Face", icon: Smile },
  { id: "clothes", label: "Outfit", icon: Shirt }
];

interface AvatarBuilderProps {
  onComplete: (config: AvatarConfig | null, name: string) => void;
  initialName?: string;
  initialConfig?: AvatarConfig;
}

const normaliseName = (v: string) => v.replace(/\s+/g, " ").trim();

const stableConfigKey = (cfg: AvatarConfig) => JSON.stringify(cfg);

const downloadSVG = (svgEl: SVGElement, filename: string) => {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const AvatarBuilder = ({ onComplete, initialName = "", initialConfig }: AvatarBuilderProps) => {
  const [config, setConfig] = useState<AvatarConfig>(() => initialConfig || genConfig());
  const [name, setName] = useState<string>(() => initialName);
  const [activeTab, setActiveTab] = useState<Tab>("hair");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialName !== undefined) setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const configKey = useMemo(() => stableConfigKey(config), [config]);

  const updateConfig = useCallback((key: keyof AvatarConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const randomise = useCallback(() => {
    setConfig(genConfig());
  }, []);

  const handleDownload = useCallback(() => {
    if (!avatarRef.current) return;
    const svg = avatarRef.current.querySelector("svg") as SVGElement | null;
    if (!svg) return;

    const fileBase = normaliseName(name) || "avatar";
    downloadSVG(svg, `${fileBase}.svg`);

    setToast("Downloaded");
    window.setTimeout(() => setToast(null), 1500);
  }, [name]);

  const handleCancel = useCallback(() => {
    onComplete(initialConfig || null, initialName || "Guest");
  }, [initialConfig, initialName, onComplete]);

  const handleSave = useCallback(() => {
    const clean = normaliseName(name);
    if (!clean) return;

    setSaving(true);
    try {
      onComplete(config, clean);
    } finally {
      setSaving(false);
    }
  }, [config, name, onComplete]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        randomise();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDownload();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCancel, handleDownload, handleSave, randomise]);

  const canSave = normaliseName(name).length > 0;

  const ColorPicker = useCallback(
    ({ attr, options }: { attr: keyof AvatarConfig; options: string[] }) => (
      <div className="flex flex-wrap gap-3">
        {options.map(color => {
          const selected = (config as any)[attr] === color;
          return (
            <motion.button
              key={color}
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateConfig(attr, color)}
              className={`w-10 h-10 rounded-full shadow-sm transition-all relative ${
                selected ? "ring-2 ring-offset-2 ring-black scale-[1.02]" : "hover:ring-2 hover:ring-offset-1 hover:ring-gray-200"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`${String(attr)} ${color}`}
              title={color}
            >
              {selected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                  <Check size={14} className={["#FFFFFF", "#F0F0F0", "#FFF5B9"].includes(color) ? "text-black" : "text-white"} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    ),
    [config, updateConfig]
  );

  const StylePicker = useCallback(
    ({ attr, options }: { attr: keyof AvatarConfig; options: readonly string[] }) => (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map(opt => {
          const selected = (config as any)[attr] === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => updateConfig(attr, opt)}
              className={`px-3 py-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                selected
                  ? "bg-black text-white border-black shadow-md scale-[1.01]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.replace(/([A-Z])/g, " $1").trim()}
            </button>
          );
        })}
      </div>
    ),
    [config, updateConfig]
  );

  return (
    <div className="fixed inset-0 z-[60] bg-[#F8F9FB] flex flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-5/12 lg:w-4/12 bg-white relative flex flex-col items-center justify-center p-6 border-r border-gray-200 shadow-xl z-10">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />

        <div className="absolute top-6 left-0 right-0 text-center z-10 px-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Identity Lab</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Ctrl or Cmd S save, R randomise, D download
          </p>
        </div>

        <div className="relative group z-10 mt-12">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-3xl opacity-60 scale-110 group-hover:scale-125 transition-transform duration-700" />

          <motion.div
            ref={avatarRef}
            key={configKey}
            initial={{ scale: 0.96, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative w-64 h-64 md:w-72 md:h-72 rounded-full border-[8px] border-white shadow-2xl bg-white overflow-hidden"
          >
            <Avatar className="w-full h-full" {...config} />
          </motion.div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              type="button"
              onClick={randomise}
              className="p-3 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-blue-600 hover:scale-110 transition-all"
              title="Randomise Ctrl or Cmd R"
            >
              <Shuffle size={20} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-3 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-green-600 hover:scale-110 transition-all"
              title="Download SVG Ctrl or Cmd D"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="w-full max-w-xs mt-12 relative group z-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="text-gray-400 group-focus-within:text-black transition-colors" size={18} />
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your Display Name"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-4 font-bold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all text-center shadow-sm"
          />
          <p className="text-[10px] text-gray-400 font-semibold mt-2 text-center">
            Keep it short, this shows in the sidebar
          </p>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
        <div className="px-6 pt-6 pb-2 bg-white border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${
                    isActive ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                {activeTab === "base" && (
                  <>
                    <Section title="Skin Tone">
                      <ColorPicker attr={"faceColor"} options={OPTIONS.base.faceColor} />
                    </Section>
                    <Section title="Background">
                      <ColorPicker attr={"bgColor"} options={OPTIONS.base.bgColor} />
                    </Section>
                    <Section title="Ear Size">
                      <StylePicker attr={"earSize"} options={OPTIONS.base.earSize} />
                    </Section>
                  </>
                )}

                {activeTab === "hair" && (
                  <>
                    <Section title="Hair Style">
                      <StylePicker attr={"hairStyle"} options={OPTIONS.hair.hairStyle} />
                    </Section>
                    <Section title="Headwear">
                      <StylePicker attr={"hatStyle"} options={OPTIONS.hair.hatStyle} />
                    </Section>
                    <Section title="Hair Colour">
                      <ColorPicker attr={"hairColor"} options={OPTIONS.hair.hairColor} />
                    </Section>
                  </>
                )}

                {activeTab === "face" && (
                  <>
                    <Section title="Mouth">
                      <StylePicker attr={"mouthStyle"} options={OPTIONS.face.mouthStyle} />
                    </Section>
                    <Section title="Eyes">
                      <StylePicker attr={"eyeStyle"} options={OPTIONS.face.eyeStyle} />
                    </Section>
                    <Section title="Glasses">
                      <StylePicker attr={"glassesStyle"} options={OPTIONS.face.glassesStyle} />
                    </Section>
                    <Section title="Nose">
                      <StylePicker attr={"noseStyle"} options={OPTIONS.face.noseStyle} />
                    </Section>
                  </>
                )}

                {activeTab === "clothes" && (
                  <>
                    <Section title="Outfit Style">
                      <StylePicker attr={"shirtStyle"} options={OPTIONS.clothes.shirtStyle} />
                    </Section>
                    <Section title="Fabric Colour">
                      <ColorPicker attr={"shirtColor"} options={OPTIONS.clothes.shirtColor} />
                    </Section>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors px-4 py-2"
          >
            <X size={18} /> Cancel
          </button>

          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <>
                <span>Saving</span>
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              </>
            ) : (
              <>
                <span>Save and Continue</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{title}</h4>
    {children}
  </div>
);
