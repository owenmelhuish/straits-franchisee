"use client";

import { TemplateLayer, AssetBank } from "@/types/template";
import { Pencil } from "lucide-react";

interface LayerReviewListProps {
  layers: TemplateLayer[];
  assetBanks: AssetBank[];
  onLayerUpdate: (layerId: string, updates: Partial<TemplateLayer>) => void;
  onCreateBank: (name: string, type: "image" | "text") => void;
}

export function LayerReviewList({
  layers,
  assetBanks,
  onLayerUpdate,
  onCreateBank,
}: LayerReviewListProps) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Layers
      </h3>
      {layers.map((layer) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          assetBanks={assetBanks}
          onUpdate={onLayerUpdate}
          onCreateBank={onCreateBank}
        />
      ))}
    </div>
  );
}

const CREATE_NEW_VALUE = "__create_new__";

function LayerItem({
  layer,
  assetBanks,
  onUpdate,
  onCreateBank,
}: {
  layer: TemplateLayer;
  assetBanks: AssetBank[];
  onUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
  onCreateBank: (name: string, type: "image" | "text") => void;
}) {
  // Filter banks by compatible type
  const compatibleType = layer.type === "text" ? "text" : "image";
  const compatibleBanks = assetBanks.filter((b) => b.type === compatibleType);

  function handleBankChange(value: string) {
    if (value === CREATE_NEW_VALUE) {
      // Auto-create a bank named after this layer
      const bankName = layer.name
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      onCreateBank(bankName, compatibleType);
      onUpdate(layer.id, { linkedBank: bankName });
    } else {
      onUpdate(layer.id, { linkedBank: value || undefined });
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
      <span className="w-14 shrink-0 truncate text-xs text-muted-foreground">{layer.type}</span>
      <span className="flex-1 truncate font-medium" title={layer.name}>{layer.name}</span>

      <button
        type="button"
        onClick={() => onUpdate(layer.id, { editable: !layer.editable })}
        className={`rounded p-1 ${layer.editable ? "text-primary" : "text-muted-foreground"}`}
        title={layer.editable ? "Editable" : "Not editable"}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {layer.editable && (
        <select
          value={layer.linkedBank || ""}
          onChange={(e) => handleBankChange(e.target.value)}
          className="w-32 rounded border px-1.5 py-0.5 text-xs"
        >
          <option value="">No bank</option>
          {compatibleBanks.map((bank) => (
            <option key={bank.id || bank.name} value={bank.name}>
              {bank.name}
            </option>
          ))}
          <option value={CREATE_NEW_VALUE}>+ Create new bank...</option>
        </select>
      )}
    </div>
  );
}
