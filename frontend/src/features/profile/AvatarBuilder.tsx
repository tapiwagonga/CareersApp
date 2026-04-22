import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Avatar, { genConfig, type AvatarConfig } from "react-nice-avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Shuffle,
  User,
  Smile,
  Scissors,
  Shirt,
  Download,
  Check,
  X
} from "lucide-react";

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
  { id: "base", label: "Base", icon: User },
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

const stableKey = (cfg: AvatarConfig) => JSON.stringify(cfg);

export const AvatarBuilder = ({
  onComplete,
  initialName = "",
  initialConfig
}: AvatarBuilderProps) => {
  const [config, setConfig] = useState<AvatarConfig>(() => initialConfig || genConfig());
  const [name, setName] = useState(initialName);
  const [tab, setTab] = useState<Tab>("hair");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const key = useMemo(() => stableKey(config), [config]);

  const update = useCallback((k: keyof AvatarConfig, v: any) => {
    setConfig(prev => ({ ...prev, [k]: v }));
  }, []);

  const randomise = useCallback(() => {
    setConfig(genConfig());
  }, []);

  const download = useCallback(() => {
    const svg = avatarRef.current?.querySelector("svg") as SVGElement | null;
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${normaliseName(name) || "avatar"}.svg`;
    a.click();

    URL.revokeObjectURL(url);

    setToast("Downloaded");
    setTimeout(() => setToast(null), 1200);
  }, [name]);

  const canSave = normaliseName(name).length > 0;

  const save = useCallback(() => {
    if (!canSave) return;
    setSaving(true);

    try {
      onComplete(config, normaliseName(name));
    } finally {
      setTimeout(() => setSaving(false), 400);
    }
  }, [config, name, onComplete, canSave]);

  const Color = ({ attr, options }: any) => (
    <div className="flex flex-wrap gap-2">
      {options.map((c: string) => {
        const active = (config as any)[attr] === c;
        return (
          <button
            key={c}
            onClick={() => update(attr, c)}
            className={`w-9 h-9 rounded-full border transition ${
              active ? "ring-2 ring-black scale-105" : "hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          >
            {active && <Check size={12} className="text-white mx-auto" />}
          </button>
        );
      })}
    </div>
  );

  const Style = ({ attr, options }: any) => (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o: string) => {
        const active = (config as any)[attr] === o;
        return (
          <button
            key={o}
            onClick={() => update(attr, o)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              active
                ? "bg-black text-white border-black"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col md:flex-row overflow-hidden">
      {/* LEFT PREVIEW */}
      <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 border-r relative">
        <h2 className="absolute top-6 text-lg font-bold">Identity Lab</h2>

        <motion.div
          key={key}
          ref={avatarRef}
          className="w-64 h-64 rounded-full border-8 border-white shadow-xl"
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
        >
          <Avatar className="w-full h-full" {...config} />
        </motion.div>

        <div className="flex gap-3 mt-6">
          <button onClick={randomise} className="p-3 rounded-full border">
            <Shuffle size={18} />
          </button>
          <button onClick={download} className="p-3 rounded-full border">
            <Download size={18} />
          </button>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Display name"
          className="mt-6 w-64 text-center p-3 border rounded-xl font-semibold"
        />

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-6 bg-black text-white px-4 py-2 rounded-full text-xs"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex gap-2 p-4 border-b overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border ${
                  active ? "bg-black text-white" : "bg-white"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              {tab === "base" && (
                <>
                  <Color attr="faceColor" options={OPTIONS.base.faceColor} />
                  <Color attr="bgColor" options={OPTIONS.base.bgColor} />
                  <Style attr="earSize" options={OPTIONS.base.earSize} />
                </>
              )}

              {tab === "hair" && (
                <>
                  <Style attr="hairStyle" options={OPTIONS.hair.hairStyle} />
                  <Style attr="hatStyle" options={OPTIONS.hair.hatStyle} />
                  <Color attr="hairColor" options={OPTIONS.hair.hairColor} />
                </>
              )}

              {tab === "face" && (
                <>
                  <Style attr="eyeStyle" options={OPTIONS.face.eyeStyle} />
                  <Style attr="glassesStyle" options={OPTIONS.face.glassesStyle} />
                  <Style attr="noseStyle" options={OPTIONS.face.noseStyle} />
                  <Style attr="mouthStyle" options={OPTIONS.face.mouthStyle} />
                </>
              )}

              {tab === "clothes" && (
                <>
                  <Style attr="shirtStyle" options={OPTIONS.clothes.shirtStyle} />
                  <Color attr="shirtColor" options={OPTIONS.clothes.shirtColor} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t flex justify-between bg-white">
          <button onClick={() => onComplete(null, "Guest")} className="text-sm text-gray-500">
            Cancel
          </button>

          <button
            disabled={!canSave || saving}
            onClick={save}
            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>
  );
};