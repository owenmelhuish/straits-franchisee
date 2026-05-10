"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  useBuilderStore,
  selectActiveFormat,
  selectActiveSlide,
  selectAllSlidesReady,
} from "@/stores/builder-store";
import { SlideCanvas, SlideExportFns } from "./slide-canvas";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { LaunchModal, CampaignData } from "@/components/builder/launch-modal";
import { exportToStorage } from "@/lib/canvas/export-to-storage";
import { TemplateConfig } from "@/types/template";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/client";
import {
  ChevronLeft,
  Download,
  Rocket,
  Layers,
  Image,
  Type,
  Square,
  Settings2,
  ChevronDown,
  Plus,
  Minus,
  Maximize,
} from "lucide-react";

const LAYER_ICONS: Record<string, typeof Image> = { image: Image, text: Type, rect: Square };

interface FranchiseeBuilderProps {
  template: TemplateConfig;
}

export function FranchiseeBuilder({ template }: FranchiseeBuilderProps) {
  const t = useT();
  const setTemplate = useBuilderStore((s) => s.setTemplate);
  const format = useBuilderStore(selectActiveFormat);
  const activeSlide = useBuilderStore(selectActiveSlide);
  const activeSlideIndex = useBuilderStore((s) => s.activeSlideIndex);
  const setActiveSlideIndex = useBuilderStore((s) => s.setActiveSlideIndex);
  const layerSelections = useBuilderStore((s) => s.layerSelections);
  const setLayerSelection = useBuilderStore((s) => s.setLayerSelection);
  const markSlideReady = useBuilderStore((s) => s.markSlideReady);
  const allSlidesReady = useBuilderStore(selectAllSlidesReady);
  const setExporting = useBuilderStore((s) => s.setExporting);
  const isExporting = useBuilderStore((s) => s.isExporting);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  // Registry of each slide's export functions (keyed by slide id).
  const exportFnsRef = useRef<Record<string, SlideExportFns>>({});
  const registerExport = useCallback((slideId: string, fns: SlideExportFns) => {
    exportFnsRef.current[slideId] = fns;
  }, []);

  // Init template
  useEffect(() => { setTemplate(template); }, [setTemplate]);

  // Unsaved changes
  const defaultSelections = useMemo(() => {
    const d: Record<string, string> = {};
    for (const fmt of template.formats) {
      for (const slide of fmt.slides) {
        for (const l of slide.layers) {
          if (!l.editable || !l.linkedBank) continue;
          const v = l.type === "image" ? l.src : l.text;
          if (v) d[l.id] = v;
        }
      }
    }
    return d;
  }, [template]);
  useUnsavedChangesWarning(JSON.stringify(layerSelections) !== JSON.stringify(defaultSelections));

  // Canvas + zoom/pan
  const containerRef = useRef<HTMLDivElement>(null);
  const slides = format?.slides ?? [];
  const canvasWidth = format?.width ?? 1080;
  const canvasHeight = format?.height ?? 1920;
  const SLIDE_GAP = 48;
  const rowWidth = slides.length * canvasWidth + Math.max(0, slides.length - 1) * SLIDE_GAP;
  const rowHeight = canvasHeight;

  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const didPanRef = useRef(false);

  const ZOOM_STEP = 0.05;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;

  // Fit to view: scale the whole slide row (width = N * canvasWidth + gaps) into the viewport.
  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const padding = 80;
    const s = Math.min(
      (el.clientWidth - padding * 2) / Math.max(1, rowWidth),
      (el.clientHeight - padding * 2) / Math.max(1, rowHeight),
      1
    );
    setZoom(s);
    setPan({ x: 0, y: 0 });
  }, [rowWidth, rowHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    fitToView();
    const obs = new ResizeObserver(fitToView);
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitToView]);

  // Space key for pan mode — but only when focus isn't in an editable input
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isEditable(e.target)) { e.preventDefault(); spaceHeld.current = true; if (containerRef.current) containerRef.current.style.cursor = "grab"; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") { spaceHeld.current = false; if (containerRef.current && !isPanning.current) containerRef.current.style.cursor = ""; }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), MIN_ZOOM), MAX_ZOOM));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const isBg = e.target === containerRef.current || (e.target as HTMLElement).dataset?.viewport === "bg";
    if (e.button === 1 || spaceHeld.current || isBg) {
      e.preventDefault();
      isPanning.current = true;
      didPanRef.current = false;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
      if (containerRef.current) containerRef.current.style.cursor = "grabbing";
    }
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) didPanRef.current = true;
    setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
  }, []);

  const onMouseUp = useCallback(() => {
    if (isPanning.current) { isPanning.current = false; if (containerRef.current) containerRef.current.style.cursor = spaceHeld.current ? "grab" : ""; }
  }, []);

  const activeSlideLayers = useMemo(() => activeSlide?.layers ?? [], [activeSlide]);
  const handleSlideClick = useCallback((index: number) => {
    // Ignore clicks that came from a pan drag
    if (didPanRef.current) { didPanRef.current = false; return; }
    setActiveSlideIndex(index);
  }, [setActiveSlideIndex]);

  // User
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (document.cookie.match(/(?:^|; )dev-role=([^;]*)/)) setUserId("00000000-0000-0000-0000-000000000000");
  }, []);

  // Collect blobs from all slides — used by publish + export-all.
  const getAllSlideBlobs = useCallback(async (): Promise<Blob[]> => {
    const out: Blob[] = [];
    for (const slide of slides) {
      const fns = exportFnsRef.current[slide.id];
      if (!fns)
        throw new Error(
          t.builder.slideNotReady.replace(
            "{name}",
            slide.label ?? slide.id
          )
        );
      const blob = await fns.getBlob();
      if (!blob)
        throw new Error(
          t.builder.slideExportFailed.replace(
            "{name}",
            slide.label ?? slide.id
          )
        );
      out.push(blob);
    }
    return out;
  }, [slides, t]);

  // Export: triggers per-slide PNG downloads
  const handleExportAll = useCallback(() => {
    const formatName = format?.name ?? "creative";
    slides.forEach((slide, i) => {
      const fns = exportFnsRef.current[slide.id];
      const suffix = slides.length > 1 ? `-slide${i + 1}` : "";
      fns?.exportPng(`${template.slug}-${formatName}${suffix}.png`);
    });
  }, [slides, format, template.slug]);

  // Publish
  const handlePublish = useCallback(async (campaign: CampaignData) => {
    const formatName = format?.name ?? "creative";
    // Download each slide locally for the user
    handleExportAll();
    if (userId) {
      try {
        setExporting(true);
        const blobs = await getAllSlideBlobs();
        const result = await exportToStorage({
          blobs,
          userId,
          templateId: template.id,
          templateSlug: template.slug,
          templateName: template.name,
          formatName,
          selections: layerSelections,
          campaign,
        });
        toast.success(result.metaAdId ? t.builder.publishedToMeta : t.builder.campaignPublishedShort, {
          description: result.metaAdId ? t.builder.publishedMetaDescShort : t.builder.publishedSavedDescShort,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : t.builder.saveCampaignFailed;
        toast.error(msg);
      } finally {
        setExporting(false);
      }
    } else {
      toast.success(t.builder.creativeExported);
    }
    setShowLaunchModal(false);
  }, [format, userId, layerSelections, setExporting, handleExportAll, getAllSlideBlobs, template.id, template.name, template.slug, t]);

  // Editable layers for right panel: anything marked editable on the active slide.
  // Text layers without a linkedBank are free-form (franchisee types their own).
  const editableLayers = activeSlideLayers.filter(
    (l) => l.editable && (l.linkedBank || l.type === "text"),
  );
  const sortedLayers = [...activeSlideLayers].sort((a, b) => b.zIndex - a.zIndex);

  // Launch modal data — only bank-backed layers carry a linkedBank
  const editableLayersMeta = editableLayers
    .filter((l) => l.linkedBank)
    .map((l) => ({ id: l.id, name: l.name, linkedBank: l.linkedBank }));
  const bankMeta = template.assetBanks.map((b) => ({ name: b.name, type: b.type }));

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: "#F4F4F4", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── TOP TOOLBAR ── */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}
        className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
        {/* Current format label */}
        <span className="px-2 text-[13px] font-medium text-[#1A1A1A]">
          {format?.label ?? ""}
        </span>
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <span className="text-[13px] tabular-nums text-[#A5A5A5] px-1">{Math.round(zoom * 100)}%</span>
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <button onClick={handleExportAll}
          className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#333]">
          <Download className="h-3.5 w-3.5" />
          {t.builder.export}{slides.length > 1 ? ` (${slides.length})` : ""}
        </button>
      </div>

      {/* ── LEFT PANEL ── */}
      <div style={{ position: "absolute", left: 12, top: 12, bottom: 12, width: 260, zIndex: 10 }}
        className="flex flex-col overflow-hidden rounded-[32px] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {/* Back + title */}
        <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[#A5A5A5] hover:text-[#1A1A1A] transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> {t.builder.back}
        </Link>
        <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{template.name}</h2>
        <p className="text-[12px] text-[#A5A5A5] mt-0.5">{template.description}</p>

        {/* Scene / Assets tab (decorative for now) */}
        <div className="mt-4 flex gap-1 rounded-xl bg-[#F4F4F4] p-1">
          <button className="flex-1 rounded-lg bg-white py-2 text-[13px] font-medium text-[#1A1A1A] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]">{t.builder.sceneTab}</button>
          <button className="flex-1 rounded-lg py-2 text-[13px] font-medium text-[#A5A5A5]">{t.builder.assetsTab}</button>
        </div>

        {/* Layer list */}
        <div className="mt-4 flex-1 overflow-y-auto -mx-2">
          {sortedLayers.map((layer) => {
            const Icon = LAYER_ICONS[layer.type] || Square;
            return (
              <div key={layer.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] cursor-default transition-colors ${layer.editable ? "bg-[#F4F4F4] text-[#1A1A1A]" : "text-[#666] hover:bg-[#F4F4F4]"}`}>
                <Icon className="h-4 w-4 shrink-0 text-[#A5A5A5]" />
                <span className="flex-1 truncate">{layer.name}</span>
                {layer.editable && (
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#A5A5A5] shadow-sm">{t.builder.editable}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER CANVAS (pannable + zoomable) — N slides side-by-side ── */}
      <div ref={containerRef} data-viewport="bg"
        style={{ position: "absolute", left: 284, right: 324, top: 0, bottom: 0, overflow: "hidden" }}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        {/* Slide row centered with pan + zoom */}
        <div data-viewport="bg" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div data-viewport="bg" style={{
            width: rowWidth, height: rowHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            display: "flex",
            alignItems: "center",
            gap: SLIDE_GAP,
          }}>
            {format && slides.map((slide, i) => (
              <SlideCanvas
                key={slide.id}
                slide={slide}
                format={format}
                layerSelections={layerSelections}
                isActive={i === activeSlideIndex}
                index={i}
                onClick={() => handleSlideClick(i)}
                onReady={() => markSlideReady(slide.id, true)}
                registerExport={registerExport}
              />
            ))}
          </div>
        </div>

        {/* Floating zoom bar — bottom center */}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}
          className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <button onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP * 2, MIN_ZOOM))}
            className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#E0E0E0] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A1A]" />
          <button onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP * 2, MAX_ZOOM))}
            className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <div className="h-3.5 w-px bg-[#E0E0E0]" />
          <button onClick={fitToView} title={t.builder.fitToView}
            className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]">
            <Maximize className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[28px] text-center text-[11px] tabular-nums text-[#666]">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ position: "absolute", right: 12, top: 12, bottom: 12, width: 300, zIndex: 10 }}
        className="flex flex-col overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">

        {/* Controls header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1A1A]">
            <Settings2 className="h-4 w-4 text-[#A5A5A5]" />
            {t.builder.controls}
          </h3>
          {slides.length > 1 && (
            <span className="rounded-full bg-[#F4F4F4] px-2 py-0.5 text-[11px] font-medium text-[#666]">
              {t.builder.slideOf
                .replace("{n}", String(activeSlideIndex + 1))
                .replace("{total}", String(slides.length))}
            </span>
          )}
        </div>

        {/* Editable layer dropdowns */}
        <div className="space-y-5 flex-1">
          {editableLayers.map((layer) => {
            // Free-form text (no linked bank) — render a textarea
            if (layer.type === "text" && !layer.linkedBank) {
              const currentValue = layerSelections[layer.id] ?? layer.text ?? "";
              return (
                <div key={layer.id}>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
                    {layer.name}
                  </label>
                  <textarea
                    value={currentValue}
                    onChange={(e) => setLayerSelection(layer.id, e.target.value)}
                    rows={2}
                    placeholder={t.builder.typeYourText}
                    className="w-full resize-none rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 text-[13px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                  />
                </div>
              );
            }

            const bank = template.assetBanks.find((b) => b.name === layer.linkedBank);
            if (!bank) return null;
            const currentValue = layerSelections[layer.id] || (layer.type === "image" ? layer.src : layer.text) || "";

            return (
              <div key={layer.id}>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
                  {bank.name}
                </label>
                {bank.type === "image" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {bank.items.map((item) => (
                      <button key={item.id} onClick={() => setLayerSelection(layer.id, item.value)}
                        className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${item.value === currentValue ? "border-[#1A1A1A] shadow-[0px_2px_8px_rgba(0,0,0,0.1)]" : "border-transparent hover:border-[#E0E0E0]"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.value} alt={item.label} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={currentValue}
                      onChange={(e) => setLayerSelection(layer.id, e.target.value)}
                      className="w-full appearance-none rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#1A1A1A] focus:border-[#D1D1D1] focus:outline-none"
                    >
                      {bank.items.map((item) => (
                        <option key={item.id} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A5A5A5]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-[#E0E0E0]" />

        {/* Format info */}
        <div className="mb-4">
          <div className="flex items-center justify-between rounded-xl bg-[#F4F4F4] px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">{t.builder.format}</p>
              <p className="text-[13px] font-medium text-[#1A1A1A]">{format?.label}</p>
            </div>
            <p className="text-[13px] text-[#666]">{format?.width} × {format?.height}</p>
          </div>
        </div>

        {/* Launch button */}
        <button
          onClick={() => setShowLaunchModal(true)}
          disabled={!allSlidesReady}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-40"
        >
          <Rocket className="h-4 w-4" />
          {t.builder.launchCampaign}
        </button>
      </div>

      {/* ── LAUNCH MODAL ── */}
      {showLaunchModal && (
        <LaunchModal
          templateName={template.name}
          formatName={format?.label ?? format?.name ?? "Default"}
          formatSize={format ? `${format.width}×${format.height}` : ""}
          selections={layerSelections}
          assetBanks={bankMeta}
          layers={editableLayersMeta}
          isPublishing={isExporting}
          onPublish={handlePublish}
          onClose={() => setShowLaunchModal(false)}
        />
      )}
    </div>
  );
}
