"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMapperCanvas } from "@/hooks/use-mapper-canvas";
import { useMapperStore } from "@/stores/mapper-store";
import { LayerPropertiesForm } from "@/components/mapper/layer-properties-form";
import { ImageBankEditor } from "@/components/mapper/image-bank-editor";
import { TextBankEditor } from "@/components/mapper/text-bank-editor";
import { BankEditor } from "@/components/admin/bank-editor";
import { TemplateLayer, AssetBankItem } from "@/types/template";
import { STANDARD_FORMATS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Upload,
  Type as TypeIcon,
  Image as ImageIcon,
  Square,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Maximize,
} from "lucide-react";

/* ─── Format selection screen ─── */
function FormatPicker({ onSelect }: { onSelect: (fmt: typeof STANDARD_FORMATS[number]) => void }) {
  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F4F4F4", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-3xl rounded-[24px] bg-white p-10 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="mb-6">
          <Link href="/admin/templates" className="inline-flex items-center gap-1 text-[13px] text-[#A5A5A5] hover:text-[#1A1A1A] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to templates
          </Link>
        </div>
        <h1 className="mb-2 text-center text-[16px] font-semibold text-[#1A1A1A]">Create New Template</h1>
        <p className="mb-8 text-center text-[13px] text-[#666]">Select the ad format for this template</p>
        <div className="grid grid-cols-4 gap-4">
          {STANDARD_FORMATS.map((fmt) => {
            const aspect = fmt.width / fmt.height;
            let pw = 80, ph = pw / aspect;
            if (ph > 100) { ph = 100; pw = ph * aspect; }
            return (
              <button key={fmt.name} onClick={() => onSelect(fmt)}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-4 py-6 transition-all hover:border-[#1A1A1A] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex h-[100px] items-center justify-center">
                  <div className="rounded-lg border border-[#E0E0E0] bg-[#F4F4F4] group-hover:border-[#D1D1D1] group-hover:bg-[#EBEBEB] transition-colors" style={{ width: pw, height: ph }} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-[#1A1A1A]">{fmt.label}</p>
                  <p className="text-[11px] text-[#A5A5A5]">{fmt.width} × {fmt.height}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Main builder ─── */
export default function Demo2Page() {
  const [selectedFormat, setSelectedFormat] = useState<typeof STANDARD_FORMATS[number] | null>(null);

  if (!selectedFormat) return <FormatPicker onSelect={setSelectedFormat} />;

  return <TemplateBuilder format={selectedFormat} />;
}

function TemplateBuilder({ format: initialFormat }: { format: typeof STANDARD_FORMATS[number] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapper canvas hook
  const { canvasRef, addImageLayer, addTextBox, removeLayer, resizeCanvas, updateCanvasObject, previewImageOnLayer, previewTextOnLayer, getLayerTransform } = useMapperCanvas();

  // Store
  const { name, slug, description, setName, setSlug, setDescription, assetBanks, setAssetBanks,
    formats, getActiveLayers, getSelectedLayer, selectedLayerId, setSelectedLayerId,
    updateLayer, reorderLayers } = useMapperStore();

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      useMapperStore.setState({
        formats: [{ name: initialFormat.name, label: initialFormat.label, width: initialFormat.width, height: initialFormat.height, layers: [] }],
        activeFormatIndex: 0, name: "", slug: "", description: "", assetBanks: [], selectedLayerId: null,
      });
      resizeCanvas(initialFormat.width, initialFormat.height);
    }
  }, [initialFormat, resizeCanvas]);

  const activeFormat = formats[0] ?? { width: initialFormat.width, height: initialFormat.height, layers: [] };
  const layers = getActiveLayers();
  const selectedLayer = getSelectedLayer();

  // Zoom & pan
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const ZOOM_STEP = 0.05, MIN_ZOOM = 0.1, MAX_ZOOM = 3;

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const s = Math.min((el.clientWidth - 160) / activeFormat.width, (el.clientHeight - 160) / activeFormat.height, 1);
    setZoom(s); setPan({ x: 0, y: 0 });
  }, [activeFormat.width, activeFormat.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    fitToView();
    const obs = new ResizeObserver(fitToView);
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitToView]);

  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); spaceHeld.current = true; if (containerRef.current) containerRef.current.style.cursor = "grab"; } };
    const u = (e: KeyboardEvent) => { if (e.code === "Space") { spaceHeld.current = false; if (containerRef.current && !isPanning.current) containerRef.current.style.cursor = ""; } };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), MIN_ZOOM), MAX_ZOOM)); }, []);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const isBg = e.target === containerRef.current || (e.target as HTMLElement).dataset?.viewport === "bg";
    if (e.button === 1 || spaceHeld.current || isBg) { e.preventDefault(); isPanning.current = true; panStart.current = { x: e.clientX, y: e.clientY }; panOrigin.current = { ...pan }; if (containerRef.current) containerRef.current.style.cursor = "grabbing"; }
  }, [pan]);
  const onMouseMove = useCallback((e: React.MouseEvent) => { if (!isPanning.current) return; setPan({ x: panOrigin.current.x + (e.clientX - panStart.current.x), y: panOrigin.current.y + (e.clientY - panStart.current.y) }); }, []);
  const onMouseUp = useCallback(() => { if (isPanning.current) { isPanning.current = false; if (containerRef.current) containerRef.current.style.cursor = spaceHeld.current ? "grab" : ""; } }, []);

  // Image upload
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const n = file.name.replace(/\.[^.]+$/, "");
    try {
      const formData = new FormData();
      formData.append("file", file); formData.append("bucket", "templates"); formData.append("path", `mapper/${Date.now()}-${file.name}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) { const { url } = await res.json(); addImageLayer(url, n); }
      else { addImageLayer(URL.createObjectURL(file), n); }
    } catch { addImageLayer(URL.createObjectURL(file), n); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addImageLayer]);

  // Layer update bridging store ↔ canvas
  function handleLayerUpdate(id: string, updates: Partial<TemplateLayer>) {
    updateLayer(id, updates);
    updateCanvasObject(id, updates);
  }

  // Bank item preview — load a bank image onto the canvas at its stored position
  const handlePreviewBankItem = useCallback((item: AssetBankItem) => {
    if (!selectedLayer) return;
    previewImageOnLayer(
      selectedLayer.id,
      item.value,
      item.left ?? selectedLayer.left,
      item.top ?? selectedLayer.top,
      item.width ?? selectedLayer.width,
      item.height ?? selectedLayer.height,
    );
  }, [selectedLayer, previewImageOnLayer]);

  // Revert to the layer's original content
  const handleRevertPreview = useCallback(() => {
    if (!selectedLayer) return;
    if (selectedLayer.type === "image" && selectedLayer.src) {
      previewImageOnLayer(selectedLayer.id, selectedLayer.src, selectedLayer.left, selectedLayer.top, selectedLayer.width, selectedLayer.height);
    } else if (selectedLayer.type === "text" && selectedLayer.text) {
      previewTextOnLayer(selectedLayer.id, selectedLayer.text, {
        left: selectedLayer.left, top: selectedLayer.top, width: selectedLayer.width,
        fontSize: selectedLayer.fontSize, fontFamily: selectedLayer.fontFamily,
        fontWeight: selectedLayer.fontWeight, fill: selectedLayer.fill, textAlign: selectedLayer.textAlign,
      });
    }
  }, [selectedLayer, previewImageOnLayer, previewTextOnLayer]);

  // Preview a text bank item on the canvas
  const handlePreviewTextBankItem = useCallback((item: AssetBankItem) => {
    if (!selectedLayer) return;
    previewTextOnLayer(selectedLayer.id, item.value, {
      left: item.left ?? selectedLayer.left,
      top: item.top ?? selectedLayer.top,
      width: item.width ?? selectedLayer.width,
      fontSize: item.fontSize ?? selectedLayer.fontSize,
      fontFamily: item.fontFamily ?? selectedLayer.fontFamily,
      fontWeight: item.fontWeight ?? selectedLayer.fontWeight,
      fill: item.fill ?? selectedLayer.fill,
      textAlign: item.textAlign ?? selectedLayer.textAlign,
    });
  }, [selectedLayer, previewTextOnLayer]);

  // Save current canvas transform back to the previewing bank item
  const handleSaveBankItemTransform = useCallback(() => {
    const store = useMapperStore.getState();
    if (!store.previewingLayerId || !store.previewingBankItemId) return;
    const transform = getLayerTransform(store.previewingLayerId);
    if (!transform) return;
    const layer = store.getSelectedLayer();
    if (!layer?.linkedBank) return;
    store.updateBankItem(layer.linkedBank, store.previewingBankItemId, transform);
  }, [getLayerTransform]);

  // Save
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSave(status: "draft" | "active") {
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required"); return; }
    setSaving(true); setError(null);
    try {
      const config = useMapperStore.getState().toTemplateConfig();
      const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: config.name, slug: config.slug, description: config.description, status, config: { formats: config.formats, assetBanks: config.assetBanks } }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const t = await res.json();
      router.push(`/admin/templates/${t.id}/edit`);
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  const LAYER_ICONS: Record<string, typeof ImageIcon> = { image: ImageIcon, text: TypeIcon, rect: Square };

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: "#F4F4F4", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── TOP TOOLBAR ── */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}
        className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
        <span className="px-2 text-[13px] font-medium text-[#1A1A1A]">{initialFormat.label}</span>
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <span className="text-[13px] tabular-nums text-[#A5A5A5] px-1">{Math.round(zoom * 100)}%</span>
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <span className="text-[13px] text-[#A5A5A5] px-1">{initialFormat.width} × {initialFormat.height}</span>
      </div>

      {/* ── LEFT PANEL — Layers ── */}
      <div style={{ position: "absolute", left: 12, top: 12, bottom: 12, width: 260, zIndex: 10 }}
        className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="p-6 pb-4">
          <Link href="/admin/templates" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[#A5A5A5] hover:text-[#1A1A1A] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5] mt-4 mb-3">Layers</h2>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <Upload className="h-3.5 w-3.5" /> Image
            </button>
            <button onClick={() => addTextBox("Headline")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <TypeIcon className="h-3.5 w-3.5" /> Text
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-1">
          {layers.length === 0 && <p className="px-2 py-8 text-center text-[13px] text-[#A5A5A5]">Upload an image or add text to start.</p>}
          {layers.map((layer, index) => {
            const Icon = LAYER_ICONS[layer.type] || Square;
            return (
              <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] cursor-pointer transition-colors mb-0.5 ${selectedLayerId === layer.id ? "bg-[#F4F4F4] text-[#1A1A1A]" : "text-[#666] hover:bg-[#F4F4F4]"}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#A5A5A5]" />
                <span className="flex-1 truncate">{layer.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); if (index > 0) reorderLayers(index, index - 1); }} className="rounded-lg p-0.5 hover:bg-[#E0E0E0]" disabled={index === 0}><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (index < layers.length - 1) reorderLayers(index, index + 1); }} className="rounded-lg p-0.5 hover:bg-[#E0E0E0]" disabled={index === layers.length - 1}><ChevronDown className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="rounded-lg p-0.5 text-[#A5A5A5] hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER CANVAS ── */}
      <div ref={containerRef} data-viewport="bg"
        style={{ position: "absolute", left: 284, right: 324, top: 0, bottom: 0, overflow: "hidden", backgroundColor: "#EBEBEB", borderRadius: 24, margin: "12px 0" }}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <div data-viewport="bg" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div data-viewport="bg" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center", width: 4000, height: 4000, position: "relative", flexShrink: 0 }}>
            {/* Shadow behind the artboard area only */}
            <div style={{ position: "absolute", left: Math.round((4000 - activeFormat.width) / 2), top: Math.round((4000 - activeFormat.height) / 2), width: activeFormat.width, height: activeFormat.height, borderRadius: 12, boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.12)", pointerEvents: "none", zIndex: 1 }} />
            {/* Fabric canvas fills the full 4000x4000 area */}
            <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
          </div>
        </div>

        {/* Zoom bar */}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}
          className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <button onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP * 2, MIN_ZOOM))} className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"><Minus className="h-3.5 w-3.5" /></button>
          <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#E0E0E0] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A1A]" />
          <button onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP * 2, MAX_ZOOM))} className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"><Plus className="h-3.5 w-3.5" /></button>
          <div className="h-3.5 w-px bg-[#E0E0E0]" />
          <button onClick={fitToView} title="Fit to view" className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]"><Maximize className="h-3.5 w-3.5" /></button>
          <span className="min-w-[28px] text-center text-[11px] tabular-nums text-[#666]">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — Properties ── */}
      <div style={{ position: "absolute", right: 12, top: 12, bottom: 12, width: 300, zIndex: 10 }}
        className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Template info */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">Template Info</h3>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Campaign"
                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. spring-campaign"
                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Template description..." rows={2}
                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none resize-none" />
            </div>
          </div>

          <div className="h-px bg-[#E0E0E0]" />

          {/* Layer properties */}
          {selectedLayer ? (
            <>
              <LayerPropertiesForm
                layer={selectedLayer}
                onUpdate={handleLayerUpdate}
                hideBankItems={selectedLayer.editable && !!selectedLayer.linkedBank}
              />

              {/* Bank editors — shown when layer is editable with linked bank */}
              {selectedLayer.editable && selectedLayer.linkedBank && (
                <>
                  <div className="h-px bg-[#E0E0E0]" />
                  {selectedLayer.type === "image" ? (
                    <ImageBankEditor
                      layer={selectedLayer}
                      onPreviewItem={handlePreviewBankItem}
                      onRevertToOriginal={handleRevertPreview}
                    />
                  ) : selectedLayer.type === "text" ? (
                    <TextBankEditor
                      layer={selectedLayer}
                      onPreviewItem={handlePreviewTextBankItem}
                      onRevertToOriginal={handleRevertPreview}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#A5A5A5]">Select a layer on the canvas to edit its properties.</p>
          )}

        </div>

        {/* Save actions */}
        <div className="border-t border-[#E0E0E0] p-4 space-y-2">
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => handleSave("draft")} disabled={saving}
              className="flex-1 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 text-[13px] font-medium text-[#1A1A1A] hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] disabled:opacity-40 transition-all">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={() => handleSave("active")} disabled={saving}
              className="flex-1 rounded-xl bg-[#1A1A1A] px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-40 transition-all">
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
