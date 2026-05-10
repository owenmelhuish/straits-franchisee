"use client";

import { useCallback, useRef } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { Image, Type, Trash2, ChevronUp, ChevronDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

interface AssetPanelProps {
  onAddImage: (url: string, name: string) => void;
  onAddText: (name: string) => void;
  onRemoveLayer: (id: string) => void;
}

export function AssetPanel({ onAddImage, onAddText, onRemoveLayer }: AssetPanelProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    getActiveLayers,
    selectedLayerId,
    setSelectedLayerId,
    reorderLayers,
  } = useMapperStore();

  const layers = getActiveLayers();

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const name = file.name.replace(/\.[^.]+$/, "");

      // Try Supabase upload first, fall back to local object URL
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "templates");
      formData.append("path", `mapper/${Date.now()}-${file.name}`);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const { url } = await res.json();
          onAddImage(url, name);
        } else {
          // Supabase not available — use local object URL for preview
          const localUrl = URL.createObjectURL(file);
          onAddImage(localUrl, name);
        }
      } catch {
        // Network error — use local object URL
        const localUrl = URL.createObjectURL(file);
        onAddImage(localUrl, name);
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onAddImage]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
          {t.mapper.layers}
        </h2>
        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] transition-all hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t.mapper.image}
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] transition-all hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
            onClick={() => onAddText("Headline")}
          >
            <Type className="h-3.5 w-3.5" />
            {t.builder.layersAddTextBox}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {layers.length === 0 && (
          <p className="px-2 py-8 text-center text-[13px] text-[#A5A5A5]">
            {t.builder.layersEmptyMapper}
          </p>
        )}
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => setSelectedLayerId(layer.id)}
            className={cn(
              "group flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] cursor-pointer transition-colors",
              selectedLayerId === layer.id
                ? "bg-[#F4F4F4] text-[#1A1A1A]"
                : "text-[#666666] hover:bg-[#F4F4F4]"
            )}
          >
            {layer.type === "image" ? (
              <Image className="h-3.5 w-3.5 shrink-0 text-[#A5A5A5]" />
            ) : (
              <Type className="h-3.5 w-3.5 shrink-0 text-[#A5A5A5]" />
            )}
            <span className="flex-1 truncate">{layer.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index > 0) reorderLayers(index, index - 1);
                }}
                className="rounded-lg p-0.5 hover:bg-[#E0E0E0]"
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index < layers.length - 1) reorderLayers(index, index + 1);
                }}
                className="rounded-lg p-0.5 hover:bg-[#E0E0E0]"
                disabled={index === layers.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLayer(layer.id);
                }}
                className="rounded-lg p-0.5 text-[#A5A5A5] hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
