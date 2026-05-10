"use client";

import { useRef, useCallback } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { TemplateLayer, AssetBankItem } from "@/types/template";
import { Eye, EyeOff, Trash2, Upload, Move, GripVertical } from "lucide-react";
import { useT } from "@/lib/i18n/client";

interface ImageBankEditorProps {
  layer: TemplateLayer;
  onPreviewItem: (item: AssetBankItem) => void;
  onRevertToOriginal: () => void;
}

/**
 * Rich image bank editor — shown in the right panel when an image layer
 * is linked to a bank and marked editable. Like a Photoshop layer group:
 * - Thumbnails for each bank image
 * - Click to preview on canvas (loads at item's stored position/size)
 * - Eye icon to toggle visibility
 * - Position/size data per item
 * - Upload new images to the bank
 */
export function ImageBankEditor({ layer, onPreviewItem, onRevertToOriginal }: ImageBankEditorProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    assetBanks,
    addBankItem,
    updateBankItem,
    removeBankItem,
    previewingBankItemId,
    previewingLayerId,
    setPreviewingBankItem,
  } = useMapperStore();

  const bank = assetBanks.find((b) => b.name === layer.linkedBank);
  if (!bank || bank.type !== "image") return null;

  const isPreviewingThisLayer = previewingLayerId === layer.id;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const label = file.name.replace(/\.[^.]+$/, "");
    let url: string;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "templates");
      formData.append("path", `banks/${bank.name}/${Date.now()}-${file.name}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        url = data.url;
      } else {
        url = URL.createObjectURL(file);
      }
    } catch {
      url = URL.createObjectURL(file);
    }

    // Default position/size from the parent layer
    const newItem: AssetBankItem = {
      id: `item-${Date.now()}`,
      label,
      value: url,
      left: layer.left,
      top: layer.top,
      width: layer.width,
      height: layer.height,
    };

    addBankItem(bank.name, newItem);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePreview = (item: AssetBankItem) => {
    if (isPreviewingThisLayer && previewingBankItemId === item.id) {
      // Already previewing this one — revert to original
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
          {t.mapper.imageBank}: {bank.name}
        </h4>
        <span className="text-[11px] text-[#A5A5A5]">{bank.items.length} {t.mapper.items}</span>
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
              <div className="flex items-center gap-2 p-2">
                {/* Thumbnail */}
                <button
                  onClick={() => handlePreview(item)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E0E0E0]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.value}
                    alt={item.label}
                    className="h-full w-full object-cover"
                  />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#1A1A1A]">
                    {item.label || t.mapper.untitled}
                  </p>
                  <p className="text-[11px] text-[#A5A5A5]">
                    {item.width ?? layer.width} × {item.height ?? layer.height}
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
                    title={isActive ? t.mapper.hidePreview : t.mapper.previewOnCanvas}
                  >
                    {isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-[#A5A5A5] hover:bg-red-50 hover:text-red-500 transition-colors"
                    title={t.common.remove}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded position controls when active */}
              {isActive && (
                <div className="border-t border-[#E0E0E0] px-3 py-2">
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-[#A5A5A5]">
                    <Move className="h-3 w-3" /> {t.mapper.positionAndSize}
                  </p>
                  <p className="text-[11px] text-[#666]">
                    {t.mapper.positionHint}
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    <div>
                      <label className="text-[9px] text-[#A5A5A5]">X</label>
                      <input
                        type="number"
                        value={item.left ?? layer.left}
                        onChange={(e) => {
                          updateBankItem(bank.name, item.id, { left: Number(e.target.value) });
                          onPreviewItem({ ...item, left: Number(e.target.value) });
                        }}
                        className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#A5A5A5]">Y</label>
                      <input
                        type="number"
                        value={item.top ?? layer.top}
                        onChange={(e) => {
                          updateBankItem(bank.name, item.id, { top: Number(e.target.value) });
                          onPreviewItem({ ...item, top: Number(e.target.value) });
                        }}
                        className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#A5A5A5]">W</label>
                      <input
                        type="number"
                        value={item.width ?? layer.width}
                        onChange={(e) => {
                          updateBankItem(bank.name, item.id, { width: Number(e.target.value) });
                          onPreviewItem({ ...item, width: Number(e.target.value) });
                        }}
                        className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#A5A5A5]">H</label>
                      <input
                        type="number"
                        value={item.height ?? layer.height}
                        onChange={(e) => {
                          updateBankItem(bank.name, item.id, { height: Number(e.target.value) });
                          onPreviewItem({ ...item, height: Number(e.target.value) });
                        }}
                        className="w-full rounded-lg border border-[#E0E0E0] px-2 py-1 text-[11px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#E0E0E0] bg-white px-3 py-3 text-[13px] text-[#666] transition-all hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
      >
        <Upload className="h-4 w-4" />
        {t.mapper.addImageToBank}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
