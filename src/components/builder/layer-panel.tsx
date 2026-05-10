"use client";

import { Layers, Image, Type, Square } from "lucide-react";
import { useBuilderStore, selectActiveSlide } from "@/stores/builder-store";
import { useT } from "@/lib/i18n/client";


const LAYER_ICONS = {
  image: Image,
  text: Type,
  rect: Square,
} as const;

export function LayerPanel() {
  const t = useT();
  const slide = useBuilderStore(selectActiveSlide);

  if (!slide) return null;

  const sortedLayers = [...slide.layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A]">
        <Layers className="h-4 w-4 text-[#A5A5A5]" />
        {t.builder.layers}
      </h3>
      <div className="space-y-0.5">
        {sortedLayers.map((layer) => {
          const Icon = LAYER_ICONS[layer.type] || Square;
          return (
            <div
              key={layer.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#666666] transition-colors hover:bg-[#F4F4F4]"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#A5A5A5]" />
              <span className="truncate">{layer.name}</span>
              {layer.editable && (
                <span className="ml-auto rounded-lg bg-[#F4F4F4] px-2 py-0.5 text-[11px] font-medium text-[#666666]">
                  {t.builder.editableLong}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
