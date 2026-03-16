"use client";

import { useState } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { TemplateLayer } from "@/types/template";
import { Plus, Trash2, Upload } from "lucide-react";

const FONT_OPTIONS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Impact",
  "Comic Sans MS",
];

const WEIGHT_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Light", value: "300" },
  { label: "Semi-Bold", value: "600" },
  { label: "Extra Bold", value: "800" },
];

interface LayerPropertiesFormProps {
  layer: TemplateLayer;
  onUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
}

export function LayerPropertiesForm({ layer, onUpdate }: LayerPropertiesFormProps) {
  const { assetBanks, addAssetBank, addBankItem, removeBankItem } = useMapperStore();
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");

  const compatibleBanks = assetBanks.filter((b) =>
    layer.type === "image" ? b.type === "image" : b.type === "text"
  );

  const linkedBank = layer.linkedBank
    ? assetBanks.find((b) => b.name === layer.linkedBank)
    : undefined;

  function handleCreateBank() {
    const bankName = newBankName.trim();
    if (!bankName) return;
    const bankType = layer.type === "image" ? "image" : "text";
    const defaultValue = layer.type === "image" ? layer.src || "" : layer.text || "";

    const newBank = {
      id: crypto.randomUUID(),
      name: bankName,
      type: bankType as "image" | "text",
      items: defaultValue
        ? [{ id: `item-${Date.now()}`, label: "Default", value: defaultValue }]
        : [],
    };

    addAssetBank(newBank);
    onUpdate(layer.id, { linkedBank: bankName });
    setNewBankName("");
    setShowCreateBank(false);
  }

  function handleAddItem() {
    if (!linkedBank || !newItemValue.trim()) return;
    addBankItem(linkedBank.name, {
      id: `item-${Date.now()}`,
      label: newItemValue.trim(),
      value: newItemValue.trim(),
    });
    setNewItemValue("");
  }

  async function handleImageUploadForItem(file: File) {
    if (!linkedBank) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "templates");
    formData.append("path", `banks/${linkedBank.name}/${file.name}`);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      addBankItem(linkedBank.name, {
        id: `item-${Date.now()}`,
        label: file.name.replace(/\.[^.]+$/, ""),
        value: url,
      });
    }
  }

  // Auto-suggest bank name from layer name
  function suggestedBankName() {
    return layer.name.toLowerCase().replace(/\s+/g, "-") + "s";
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Layer Properties
      </h3>

      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate(layer.id, { name: e.target.value })}
          className="w-full rounded-md border px-2.5 py-1.5 text-sm"
        />
      </div>

      {/* Text-specific controls */}
      {layer.type === "text" && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Default Text
            </label>
            <input
              type="text"
              value={layer.text || ""}
              onChange={(e) => onUpdate(layer.id, { text: e.target.value })}
              className="w-full rounded-md border px-2.5 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Font</label>
              <select
                value={layer.fontFamily || "Arial"}
                onChange={(e) => onUpdate(layer.id, { fontFamily: e.target.value })}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Weight
              </label>
              <select
                value={layer.fontWeight || "normal"}
                onChange={(e) => onUpdate(layer.id, { fontWeight: e.target.value })}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              >
                {WEIGHT_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Font Size
              </label>
              <input
                type="number"
                value={layer.fontSize || 48}
                onChange={(e) => onUpdate(layer.id, { fontSize: Number(e.target.value) })}
                className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                min={8}
                max={200}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={layer.fill || "#000000"}
                  onChange={(e) => onUpdate(layer.id, { fill: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border p-0.5"
                />
                <input
                  type="text"
                  value={layer.fill || "#000000"}
                  onChange={(e) => onUpdate(layer.id, { fill: e.target.value })}
                  className="flex-1 rounded-md border px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Text Align
            </label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdate(layer.id, { textAlign: align })}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    (layer.textAlign || "left") === align
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "hover:bg-muted"
                  }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Image-specific display */}
      {layer.type === "image" && layer.src && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Preview</label>
          <img
            src={layer.src}
            alt={layer.name}
            className="w-full rounded-md border object-cover"
            style={{ maxHeight: 120 }}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {layer.width} x {layer.height}
          </p>
        </div>
      )}

      {/* Editable toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Editable by franchisee</label>
        <button
          onClick={() => onUpdate(layer.id, { editable: !layer.editable })}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            layer.editable ? "bg-indigo-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              layer.editable ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Linked bank — shown when editable */}
      {layer.editable && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Linked Bank
            </label>
            <select
              value={layer.linkedBank || ""}
              onChange={(e) =>
                onUpdate(layer.id, { linkedBank: e.target.value || undefined })
              }
              className="w-full rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {compatibleBanks.map((bank) => (
                <option key={bank.id} value={bank.name}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick-create bank — shown when no bank is linked */}
          {!layer.linkedBank && (
            <div>
              {!showCreateBank ? (
                <button
                  onClick={() => {
                    setNewBankName(suggestedBankName());
                    setShowCreateBank(true);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Create & link a new bank
                </button>
              ) : (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-indigo-700">New Bank</p>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="Bank name"
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateBank()}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Type: {layer.type === "image" ? "image" : "text"}
                    {(layer.type === "text" && layer.text) || (layer.type === "image" && layer.src)
                      ? ` · Current value will be added as first item`
                      : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBank}
                      disabled={!newBankName.trim()}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Create & Link
                    </button>
                    <button
                      onClick={() => setShowCreateBank(false)}
                      className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline bank items — shown when a bank is linked */}
          {linkedBank && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Bank Items ({linkedBank.items.length})
                </p>
              </div>

              {linkedBank.items.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">No items yet</p>
              )}

              {linkedBank.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  {linkedBank.type === "image" && item.value ? (
                    <img
                      src={item.value}
                      alt={item.label}
                      className="h-8 w-8 rounded border object-cover"
                    />
                  ) : null}
                  <span className="flex-1 truncate text-xs">
                    {item.label || item.value || "Untitled"}
                  </span>
                  <button
                    onClick={() => removeBankItem(linkedBank.name, item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add item inline */}
              {linkedBank.type === "text" ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    placeholder="Add text option..."
                    className="flex-1 rounded border px-2 py-1 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemValue.trim()}
                    className="rounded border p-1 text-primary hover:bg-accent disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                  <Upload className="h-3 w-3" /> Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUploadForItem(f);
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
