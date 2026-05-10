"use client";

import { useEffect, useState } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { TemplateLayer } from "@/types/template";
import { Plus, Trash2, Upload } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const FONT_OPTIONS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Impact",
  "Comic Sans MS",
  "Bebas Neue",
];

const WEIGHT_OPTION_VALUES = ["normal", "bold", "300", "600", "800"] as const;

interface LayerPropertiesFormProps {
  layer: TemplateLayer;
  onUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
  /** When true, hides the inline bank items list (because a richer editor handles it externally) */
  hideBankItems?: boolean;
}

export function LayerPropertiesForm({ layer, onUpdate, hideBankItems }: LayerPropertiesFormProps) {
  const t = useT();
  const weightLabel = (value: string): string => {
    switch (value) {
      case "normal": return t.mapper.weights.normal;
      case "bold": return t.mapper.weights.bold;
      case "300": return t.mapper.weights.light;
      case "600": return t.mapper.weights.semiBold;
      case "800": return t.mapper.weights.extraBold;
      default: return value;
    }
  };
  const alignLabel = (a: "left" | "center" | "right"): string =>
    a === "left" ? t.mapper.align.left : a === "center" ? t.mapper.align.center : t.mapper.align.right;
  const { assetBanks, addAssetBank, addBankItem, removeBankItem } = useMapperStore();
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  // Tracks user intent to be in bank mode even before a bank exists.
  // Resets when the selected layer changes.
  const [bankModeRequested, setBankModeRequested] = useState(false);
  useEffect(() => {
    setBankModeRequested(false);
    setShowCreateBank(false);
  }, [layer.id]);

  const compatibleBanks = assetBanks.filter((b) =>
    layer.type === "image" ? b.type === "image" : b.type === "text"
  );

  // For text layers: bank mode = either persisted (linkedBank set) or transiently requested
  const textInBankMode = !!layer.linkedBank || bankModeRequested;

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
        ? [{
            id: `item-${Date.now()}`,
            label: "Default",
            value: defaultValue,
            left: layer.left,
            top: layer.top,
            width: layer.width,
            height: layer.height,
          }]
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
        {t.mapper.layerProperties}
      </h3>

      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.mapper.name}</label>
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
              {t.mapper.defaultText}
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.mapper.font}</label>
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
                {t.mapper.weight}
              </label>
              <select
                value={layer.fontWeight || "normal"}
                onChange={(e) => onUpdate(layer.id, { fontWeight: e.target.value })}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
              >
                {WEIGHT_OPTION_VALUES.map((w) => (
                  <option key={w} value={w}>
                    {weightLabel(w)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.mapper.fontSize}
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.mapper.color}</label>
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
              {t.mapper.textAlign}
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
                  {alignLabel(align)}
                </button>
              ))}
            </div>
          </div>

          {/* Line spacing — multiplier on font size (1.0 = tight, 1.5 = loose). */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t.mapper.lineSpacing}</span>
              <span className="tabular-nums">{(layer.lineHeight ?? 1.2).toFixed(2)}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.6}
                max={3}
                step={0.05}
                value={layer.lineHeight ?? 1.2}
                onChange={(e) => onUpdate(layer.id, { lineHeight: Number(e.target.value) })}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[#E0E0E0] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A1A]"
              />
              <input
                type="number"
                value={layer.lineHeight ?? 1.2}
                min={0.6}
                max={3}
                step={0.05}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) onUpdate(layer.id, { lineHeight: v });
                }}
                className="w-16 rounded-md border px-2 py-1 text-xs tabular-nums"
              />
            </div>
          </div>
        </>
      )}

      {/* Image-specific display */}
      {layer.type === "image" && layer.src && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.mapper.preview}</label>
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
        <label className="text-xs font-medium text-muted-foreground">{t.mapper.editableByFranchisee}</label>
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

      {/* Text mode toggle: free-form vs bank (text only).
          We use linkedBank presence as the persistent signal, but track a
          transient "bank mode requested" so the user can toggle to bank mode
          and create a new bank before any exist. */}
      {layer.editable && layer.type === "text" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.mapper.inputMode}
          </label>
          <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
            <button
              onClick={() => {
                setBankModeRequested(false);
                onUpdate(layer.id, { linkedBank: undefined });
              }}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                !textInBankMode
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-muted-foreground hover:text-[#1A1A1A]"
              }`}
            >
              {t.mapper.freeForm}
            </button>
            <button
              onClick={() => {
                setBankModeRequested(true);
                if (compatibleBanks[0]) {
                  onUpdate(layer.id, { linkedBank: compatibleBanks[0].name });
                }
              }}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                textInBankMode
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-muted-foreground hover:text-[#1A1A1A]"
              }`}
            >
              {t.mapper.fromBank}
            </button>
          </div>
          {!textInBankMode && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {t.mapper.freeFormHint}
            </p>
          )}
        </div>
      )}

      {/* Linked bank — shown when editable. For text layers in free-form mode, the bank UI is hidden. */}
      {layer.editable && !(layer.type === "text" && !textInBankMode) && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t.mapper.linkedBank}
            </label>
            <select
              value={layer.linkedBank || ""}
              onChange={(e) =>
                onUpdate(layer.id, { linkedBank: e.target.value || undefined })
              }
              className="w-full rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="">{t.mapper.none}</option>
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
                  <Plus className="h-3 w-3" /> {t.mapper.createLinkBank}
                </button>
              ) : (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-indigo-700">{t.mapper.newBank}</p>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder={t.mapper.bankName}
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateBank()}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Type: {layer.type === "image" ? t.mapper.typeImage : t.mapper.typeText}
                    {(layer.type === "text" && layer.text) || (layer.type === "image" && layer.src)
                      ? ` · ${t.mapper.bankItemsHint}`
                      : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBank}
                      disabled={!newBankName.trim()}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {t.mapper.createLink}
                    </button>
                    <button
                      onClick={() => setShowCreateBank(false)}
                      className="rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {t.mapper.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline bank items — shown when a bank is linked (hidden when external editor handles it) */}
          {linkedBank && !hideBankItems && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {t.mapper.bankItems} ({linkedBank.items.length})
                </p>
              </div>

              {linkedBank.items.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">{t.mapper.noItemsYet}</p>
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
                    {item.label || item.value || t.mapper.untitled}
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
                    placeholder={t.mapper.addTextOption}
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
                  <Upload className="h-3 w-3" /> {t.mapper.uploadImage}
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
