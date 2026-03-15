"use client";

import { Settings2 } from "lucide-react";
import {
  useBuilderStore,
  selectActiveFormat,
  selectAssetBank,
} from "@/stores/builder-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetDropdown } from "./asset-dropdown";

export function ControlsPanel() {
  const format = useBuilderStore(selectActiveFormat);
  const template = useBuilderStore((s) => s.template);
  const layerSelections = useBuilderStore((s) => s.layerSelections);
  const setLayerSelection = useBuilderStore((s) => s.setLayerSelection);

  if (!format || !template) return null;

  // Get editable layers for the current format
  const editableLayers = format.layers
    .filter((l) => l.editable && l.linkedBank)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" />
          Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
