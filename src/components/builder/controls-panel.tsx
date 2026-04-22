"use client";

import { Settings2 } from "lucide-react";
import {
  useBuilderStore,
  selectActiveSlide,
} from "@/stores/builder-store";

import { AssetDropdown } from "./asset-dropdown";

export function ControlsPanel() {
  const slide = useBuilderStore(selectActiveSlide);
  const template = useBuilderStore((s) => s.template);
  const layerSelections = useBuilderStore((s) => s.layerSelections);
  const setLayerSelection = useBuilderStore((s) => s.setLayerSelection);

  if (!slide || !template) return null;

  // Get editable layers for the active slide
  const editableLayers = slide.layers
    .filter((l) => l.editable && l.linkedBank)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A]">
        <Settings2 className="h-4 w-4 text-[#A5A5A5]" />
        Controls
      </h3>
      <div className="space-y-4">
        {editableLayers.map((layer) => {
          const bank = template.assetBanks.find(
            (b) => b.name === layer.linkedBank
          );
          if (!bank) return null;

          const currentValue =
            layerSelections[layer.id] ||
            (layer.type === "image" ? layer.src : layer.text) ||
            "";

          return (
            <AssetDropdown
              key={layer.id}
              bank={bank}
              value={currentValue}
              onChange={(val) => setLayerSelection(layer.id, val)}
            />
          );
        })}
      </div>
    </div>
  );
}
