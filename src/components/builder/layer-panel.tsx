"use client";

import { Layers, Image, Type, Square } from "lucide-react";
import { useBuilderStore, selectActiveFormat } from "@/stores/builder-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LAYER_ICONS = {
  image: Image,
  text: Type,
  rect: Square,
} as const;

export function LayerPanel() {
  const format = useBuilderStore(selectActiveFormat);

  if (!format) return null;

  const sortedLayers = [...format.layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4" />
          Layers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sortedLayers.map((layer) => {
          const Icon = LAYER_ICONS[layer.type] || Square;
          return (
            <div
              key={layer.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{layer.name}</span>
              {layer.editable && (
                <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  editable
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
