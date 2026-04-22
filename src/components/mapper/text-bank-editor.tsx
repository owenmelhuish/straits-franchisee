"use client";

import { useState } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { TemplateLayer, AssetBankItem } from "@/types/template";
import { Eye, EyeOff, Trash2, Plus, Type, ChevronDown } from "lucide-react";

const FONT_OPTIONS = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact", "Bebas Neue"];
const WEIGHT_OPTIONS = [
  { label: "Light", value: "300" },
  { label: "Normal", value: "normal" },
  { label: "Semi-Bold", value: "600" },
  { label: "Bold", value: "bold" },
  { label: "Extra Bold", value: "800" },
];

interface TextBankEditorProps {
  layer: TemplateLayer;
  onPreviewItem: (item: AssetBankItem) => void;
  onRevertToOriginal: () => void;
}

export function TextBankEditor({ layer, onPreviewItem, onRevertToOriginal }: TextBankEditorProps) {
  const {
    assetBanks,
    addBankItem,
    updateBankItem,
    removeBankItem,
    previewingBankItemId,
    previewingLayerId,
    setPreviewingBankItem,
  } = useMapperStore();

  const [newText, setNewText] = useState("");

  const bank = assetBanks.find((b) => b.name === layer.linkedBank);
  if (!bank || bank.type !== "text") return null;

  const isPreviewingThisLayer = previewingLayerId === layer.id;

  const handleAddItem = () => {
    if (!newText.trim()) return;
    const newItem: AssetBankItem = {
      id: `item-${Date.now()}`,
      label: newText.trim(),
      value: newText.trim(),
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      fill: layer.fill,
      textAlign: layer.textAlign,
      left: layer.left,
      top: layer.top,
      width: layer.width,
    };
    addBankItem(bank.name, newItem);
    setNewText("");
  };

  const handlePreview = (item: AssetBankItem) => {
    if (isPreviewingThisLayer && previewingBankItemId === item.id) {
      setPreviewingBankItem(null, null);
      onRevertToOriginal();
    } else {
      setPreviewingBankItem(layer.id, item.id);
      onPreviewItem(item);
    }
  };

  const handleDelete = (itemId: string) => {
    if (previewingBankItemId === itemId) {
      setPreviewingBankItem(null, null);
      onRevertToOriginal();
    }
    removeBankItem(bank.name, itemId);
  };

  const handleUpdateAndPreview = (itemId: string, updates: Partial<AssetBankItem>) => {
    updateBankItem(bank.name, itemId, updates);
    const item = bank.items.find((i) => i.id === itemId);
    if (item) onPreviewItem({ ...item, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
          Text Bank: {bank.name}
        </h4>
        <span className="text-[11px] text-[#A5A5A5]">{bank.items.length} items</span>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {bank.items.map((item) => {
          const isActive = isPreviewingThisLayer && previewingBankItemId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-all ${
                isActive
                  ? "border-[#1A1A1A] bg-[#FAFAFA] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]"
                  : "border-[#E0E0E0] bg-white hover:border-[#D1D1D1]"
              }`}
            >
              <div className="flex items-center gap-2 p-2.5">
                {/* Color swatch */}
                <div
                  className="h-8 w-8 shrink-0 rounded-lg border border-[#E0E0E0]"
                  style={{ backgroundColor: item.fill || layer.fill || "#000" }}
                />

                {/* Text preview */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-[13px]"
                    style={{
                      fontFamily: item.fontFamily || layer.fontFamily || "Arial",
                      fontWeight: item.fontWeight || layer.fontWeight || "normal",
                      color: item.fill || layer.fill || "#000",
                      fontSize: 13,
                    }}
                  >
                    {item.value}
                  </p>
                  <p className="text-[11px] text-[#A5A5A5]">
                    {item.fontFamily || layer.fontFamily || "Arial"} · {item.fontSize || layer.fontSize || 48}px
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePreview(item)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isActive
                        ? "bg-[#1A1A1A] text-white"
                        : "text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"
                    }`}
                    title={isActive ? "Hide preview" : "Preview on canvas"}
                  >
                    {isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-[#A5A5A5] hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded styling controls when active */}
              {isActive && (
                <div className="border-t border-[#E0E0E0] px-3 py-3 space-y-3">
                  {/* Text content */}
                  <div>
                    <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Text</label>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleUpdateAndPreview(item.id, { value: e.target.value, label: e.target.value })}
                      className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1.5 text-[12px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                    />
                  </div>

                  {/* Font + Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Font</label>
                      <div className="relative">
                        <select
                          value={item.fontFamily || layer.fontFamily || "Arial"}
                          onChange={(e) => handleUpdateAndPreview(item.id, { fontFamily: e.target.value })}
                          className="w-full appearance-none rounded-lg border border-[#E0E0E0] bg-white px-2 py-1.5 pr-6 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                        >
                          {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A5A5A5]" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Weight</label>
                      <div className="relative">
                        <select
                          value={item.fontWeight || layer.fontWeight || "normal"}
                          onChange={(e) => handleUpdateAndPreview(item.id, { fontWeight: e.target.value })}
                          className="w-full appearance-none rounded-lg border border-[#E0E0E0] bg-white px-2 py-1.5 pr-6 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                        >
                          {WEIGHT_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A5A5A5]" />
                      </div>
                    </div>
                  </div>

                  {/* Size + Color */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Size</label>
                      <input
                        type="number"
                        value={item.fontSize || layer.fontSize || 48}
                        onChange={(e) => handleUpdateAndPreview(item.id, { fontSize: Number(e.target.value) })}
                        min={8}
                        max={200}
                        className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1.5 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={item.fill || layer.fill || "#000000"}
                          onChange={(e) => handleUpdateAndPreview(item.id, { fill: e.target.value })}
                          className="h-7 w-7 cursor-pointer rounded-lg border border-[#E0E0E0] p-0.5"
                        />
                        <input
                          type="text"
                          value={item.fill || layer.fill || "#000000"}
                          onChange={(e) => handleUpdateAndPreview(item.id, { fill: e.target.value })}
                          className="flex-1 rounded-lg border border-[#E0E0E0] px-2 py-1.5 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <label className="mb-1 block text-[9px] font-medium text-[#A5A5A5]">Align</label>
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleUpdateAndPreview(item.id, { textAlign: align })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                            (item.textAlign || layer.textAlign || "left") === align
                              ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                              : "border-[#E0E0E0] text-[#666] hover:border-[#D1D1D1]"
                          }`}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new text item */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add text variant..."
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          className="flex-1 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none"
        />
        <button
          onClick={handleAddItem}
          disabled={!newText.trim()}
          className="rounded-xl bg-[#1A1A1A] p-2.5 text-white transition-colors hover:bg-[#333] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
