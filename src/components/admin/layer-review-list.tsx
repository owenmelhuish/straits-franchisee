"use client";

import { useState } from "react";
import { TemplateLayer } from "@/types/template";
import { Eye, EyeOff, Pencil } from "lucide-react";

interface LayerReviewListProps {
  layers: TemplateLayer[];
  onLayerUpdate: (layerId: string, updates: Partial<TemplateLayer>) => void;
}

export function LayerReviewList({ layers, onLayerUpdate }: LayerReviewListProps) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Layers
      </h3>
      {layers.map((layer) => (
        <LayerItem key={layer.id} layer={layer} onUpdate={onLayerUpdate} />
      ))}
    </div>
  );
}

function LayerItem({
  layer,
  onUpdate,
}: {
  layer: TemplateLayer;
  onUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
}) {
  const [bankName, setBankName] = useState(layer.linkedBank || "");

  return (
    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
      <span className="w-14 truncate text-xs text-muted-foreground">{layer.type}</span>
      <span className="flex-1 truncate font-medium">{layer.name}</span>

      <button
        onClick={() => onUpdate(layer.id, { editable: !layer.editable })}
        className={`rounded p-1 ${layer.editable ? "text-primary" : "text-muted-foreground"}`}
        title={layer.editable ? "Editable" : "Not editable"}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {layer.editable && (
        <input
          type="text"
          value={bankName}
          onChange={(e) => {
            setBankName(e.target.value);
            onUpdate(layer.id, { linkedBank: e.target.value || undefined });
          }}
          placeholder="bank name"
          className="w-24 rounded border px-2 py-0.5 text-xs"
        />
      )}
    </div>
  );
}
