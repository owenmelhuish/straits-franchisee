"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMapperCanvas } from "@/hooks/use-mapper-canvas";
import { useMapperStore } from "@/stores/mapper-store";
import { LayerPropertiesForm } from "@/components/mapper/layer-properties-form";
import { ImageBankEditor } from "@/components/mapper/image-bank-editor";
import { TextBankEditor } from "@/components/mapper/text-bank-editor";
import {
  TemplateValidation,
  computeValidationIssues,
  hasBlockingErrors,
} from "@/components/admin/template-validation";
import { TemplateLayer, AssetBankItem, TemplateConfig, TemplateFormat, createSlide } from "@/types/template";
import { SlideCanvas } from "./slide-canvas";
import { TemplateRow, templateRowToConfig } from "@/types/database";
import { STANDARD_FORMATS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Camera,
  Archive,
  Copy,
  X,
} from "lucide-react";

/* ─── Format selection screen (new template only) ─── */
function FormatPicker({ onSelect }: { onSelect: (fmt: typeof STANDARD_FORMATS[number]) => void }) {
  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F4F4F4", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-3xl rounded-[24px] bg-white p-10 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-[#A5A5A5] hover:text-[#1A1A1A] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to dashboard
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

/* ─── Top-level — picker for new, fetch+hydrate for edit ─── */
export function AdminTemplateBuilder({ templateId }: { templateId?: string } = {}) {
  const [selectedFormat, setSelectedFormat] = useState<typeof STANDARD_FORMATS[number] | null>(null);
  const [editRow, setEditRow] = useState<TemplateRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit mode: fetch template
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    fetch(`/api/templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load template");
        return res.json();
      })
      .then((data: TemplateRow) => {
        if (!cancelled) setEditRow(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load template");
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (templateId) {
    if (loadError) {
      return (
        <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F4F4F4" }}>
          <div className="rounded-2xl bg-white p-6 text-[13px] text-red-500 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            {loadError}
          </div>
        </div>
      );
    }
    if (!editRow) {
      return (
        <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F4F4F4" }}>
          <p className="text-[13px] text-[#A5A5A5]">Loading template…</p>
        </div>
      );
    }
    return <TemplateBuilder mode="edit" editRow={editRow} />;
  }

  if (!selectedFormat) return <FormatPicker onSelect={setSelectedFormat} />;
  return <TemplateBuilder mode="create" initialFormat={selectedFormat} />;
}

/* ─── Main builder ─── */
type BuilderProps =
  | { mode: "create"; initialFormat: typeof STANDARD_FORMATS[number] }
  | { mode: "edit"; editRow: TemplateRow };

function isEditMode(p: BuilderProps): p is Extract<BuilderProps, { mode: "edit" }> {
  return p.mode === "edit";
}

function TemplateBuilder(props: BuilderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapper canvas hook
  const {
    canvasRef,
    addImageLayer,
    addTextBox,
    removeLayer,
    resizeCanvas,
    loadLayers,
    updateCanvasObject,
    previewImageOnLayer,
    previewTextOnLayer,
    getLayerTransform,
    captureArtboard,
  } = useMapperCanvas();

  // Store
  const {
    name, slug, description, thumbnail,
    setName, setSlug, setDescription, setThumbnail,
    formats, activeFormatIndex, setActiveFormatIndex,
    activeSlideIndex, setActiveSlideIndex,
    addSlide, removeSlide, reorderSlides, duplicateSlide, renameSlide,
    getActiveLayers, getSelectedLayer, selectedLayerId, setSelectedLayerId,
    updateLayer, reorderLayers,
  } = useMapperStore();

  // Hydrate store + canvas on mount. Intentionally NOT guarded by a ref:
  // React StrictMode double-mounts, which disposes and re-creates the Fabric
  // canvas. We need to re-load layers onto the fresh canvas each time.
  useEffect(() => {
    if (props.mode === "create") {
      const f = props.initialFormat;
      useMapperStore.setState({
        formats: [{ name: f.name, label: f.label, width: f.width, height: f.height, slides: [createSlide()] }],
        activeFormatIndex: 0,
        activeSlideIndex: 0,
        name: "", slug: "", description: "", thumbnail: "",
        assetBanks: [], selectedLayerId: null,
        previewingBankItemId: null, previewingLayerId: null,
      });
      resizeCanvas(f.width, f.height);
      return;
    }

    // Edit mode
    const cfg: TemplateConfig = templateRowToConfig(props.editRow);
    // Migrate banks without IDs (parity with old edit page)
    const banks = cfg.assetBanks.map((b) => ({ ...b, id: b.id || crypto.randomUUID() }));
    useMapperStore.setState({
      name: cfg.name,
      slug: cfg.slug,
      description: cfg.description,
      thumbnail: cfg.thumbnail || "",
      formats: cfg.formats,
      activeFormatIndex: 0,
      activeSlideIndex: 0,
      assetBanks: banks,
      selectedLayerId: null,
      previewingBankItemId: null,
      previewingLayerId: null,
    });
    const first = cfg.formats[0];
    const firstSlide = first?.slides[0];
    if (first && firstSlide) {
      resizeCanvas(first.width, first.height);
      // Load layers after resize completes synchronously
      void loadLayers(firstSlide.layers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch format/slide: resize + reload layers when either index changes (skip first run).
  // Dimensions only change on format switch; slide switch just reloads layers.
  const lastSlideKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${activeFormatIndex}:${activeSlideIndex}`;
    if (lastSlideKey.current === null) {
      lastSlideKey.current = key;
      return;
    }
    if (lastSlideKey.current === key) return;
    const prevFormatIdx = Number(lastSlideKey.current.split(":")[0]);
    lastSlideKey.current = key;

    const fmt = formats[activeFormatIndex];
    const slide = fmt?.slides[activeSlideIndex];
    if (!fmt || !slide) return;
    if (prevFormatIdx !== activeFormatIndex) {
      resizeCanvas(fmt.width, fmt.height);
    }
    void loadLayers(slide.layers);
    setSelectedLayerId(null);
  }, [activeFormatIndex, activeSlideIndex, formats, resizeCanvas, loadLayers, setSelectedLayerId]);

  const activeFormat: TemplateFormat = formats[activeFormatIndex] ?? {
    name: "", label: "", width: 1080, height: 1080, slides: [{ id: "fallback", layers: [] }],
  };
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

  // Layout: all slides render side-by-side in a single flex row inside the pan/zoom wrapper.
  // Active slide = interactive mapper canvas. Others = faded previews.
  // Mapper wrapper clips X (to keep clicks inside the active slot's column) but leaves Y open,
  // so Fabric's handles can extend freely above and below the artboard regardless of object size.
  const SLIDE_GAP = 280;
  const HANDLE_PAD_X = 200; // horizontal headroom for handles; must be < SLIDE_GAP to not overlap neighbors
  const PLUS_SIZE = 280; // circular button diameter
  const rowWidth =
    activeFormat.slides.length * activeFormat.width +
    Math.max(0, activeFormat.slides.length - 1) * SLIDE_GAP +
    PLUS_SIZE + SLIDE_GAP;
  const rowHeight = activeFormat.height;

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const s = Math.min(
      (el.clientWidth - 160) / Math.max(1, rowWidth),
      (el.clientHeight - 160) / Math.max(1, rowHeight),
      1,
    );
    setZoom(s); setPan({ x: 0, y: 0 });
  }, [rowWidth, rowHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    fitToView();
    const obs = new ResizeObserver(fitToView);
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitToView]);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const d = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat && !isEditable(e.target)) { e.preventDefault(); spaceHeld.current = true; if (containerRef.current) containerRef.current.style.cursor = "grab"; } };
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

  function handleLayerUpdate(id: string, updates: Partial<TemplateLayer>) {
    updateLayer(id, updates);
    updateCanvasObject(id, updates);
  }

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

  const handleSaveBankItemTransform = useCallback(() => {
    const store = useMapperStore.getState();
    if (!store.previewingLayerId || !store.previewingBankItemId) return;
    const transform = getLayerTransform(store.previewingLayerId);
    if (!transform) return;
    const layer = store.getSelectedLayer();
    if (!layer?.linkedBank) return;
    store.updateBankItem(layer.linkedBank, store.previewingBankItemId, transform);
  }, [getLayerTransform]);
  void handleSaveBankItemTransform;

  // Save / publish / archive / thumbnail
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);

  const config: TemplateConfig = {
    id: isEditMode(props) ? props.editRow.id : "",
    name, slug, description, thumbnail,
    formats, assetBanks: useMapperStore.getState().assetBanks,
  };
  const validationIssues = computeValidationIssues(config);
  const hasErrors = hasBlockingErrors(validationIssues);

  async function handleGenerateThumbnail() {
    setThumbBusy(true);
    setError(null);
    try {
      const dataUrl = captureArtboard();
      if (!dataUrl) throw new Error("Could not capture canvas");
      const blob = await (await fetch(dataUrl)).blob();
      const safeSlug = slug || "template";
      const formData = new FormData();
      formData.append("file", blob, `${safeSlug}-thumbnail.png`);
      formData.append("bucket", "templates");
      formData.append("path", `thumbnails/${safeSlug}-${Date.now()}.png`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Thumbnail upload failed");
      const { url } = await res.json();
      setThumbnail(url);
      toast.success("Thumbnail captured");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Thumbnail failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setThumbBusy(false);
    }
  }

  async function handleSave(status: "draft" | "active" | "archived") {
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      toast.error("Name and slug are required");
      return;
    }
    if (status === "active" && hasErrors) {
      setError("Fix validation errors before publishing");
      toast.error("Fix validation errors before publishing");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cfg = useMapperStore.getState().toTemplateConfig();
      const body = {
        name: cfg.name,
        slug: cfg.slug,
        description: cfg.description,
        thumbnail_url: cfg.thumbnail || undefined,
        status,
        config: { formats: cfg.formats, assetBanks: cfg.assetBanks },
      };
      const isEdit = props.mode === "edit";
      const url = isEdit ? `/api/templates/${props.editRow.id}` : "/api/templates";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const updated: TemplateRow = await res.json();

      const verb =
        status === "active" ? "Published" :
        status === "archived" ? "Archived" :
        "Draft saved";
      toast.success(verb);

      if (!isEdit) {
        router.push(`/template-creator?id=${updated.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const LAYER_ICONS: Record<string, typeof ImageIcon> = { image: ImageIcon, text: TypeIcon, rect: Square };
  const isEdit = props.mode === "edit";
  const currentStatus = isEdit ? props.editRow.status : "draft";

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: "#F4F4F4", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── SLIDE STRIP (below format tabs) ── */}
      <div style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}
        className="flex items-center gap-1 rounded-2xl bg-white px-2 py-1.5 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
        {activeFormat.slides.map((s, i) => {
          const isActive = i === activeSlideIndex;
          const canDelete = activeFormat.slides.length > 1;
          const atMax = activeFormat.slides.length >= 10;
          return (
            <div key={s.id} className="group relative flex items-center">
              <button
                onClick={() => setActiveSlideIndex(i)}
                onDoubleClick={() => {
                  const next = window.prompt("Rename slide", s.label ?? `Slide ${i + 1}`);
                  if (next !== null && next.trim()) renameSlide(activeFormatIndex, i, next.trim());
                }}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  isActive ? "bg-[#1A1A1A] text-white" : "text-[#666] hover:bg-[#F4F4F4]"
                }`}
                title={`${s.label ?? `Slide ${i + 1}`} — double-click to rename`}
              >
                {s.label ?? `Slide ${i + 1}`}
              </button>
              {isActive && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => i > 0 && reorderSlides(activeFormatIndex, i, i - 1)}
                    disabled={i === 0}
                    title="Move slide left"
                    className="rounded p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A] disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3 -rotate-90" />
                  </button>
                  <button
                    onClick={() => i < activeFormat.slides.length - 1 && reorderSlides(activeFormatIndex, i, i + 1)}
                    disabled={i === activeFormat.slides.length - 1}
                    title="Move slide right"
                    className="rounded p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A] disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3 -rotate-90" />
                  </button>
                  <button
                    onClick={() => duplicateSlide(activeFormatIndex, i)}
                    disabled={atMax}
                    title="Duplicate slide"
                    className="rounded p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A] disabled:opacity-30"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => canDelete && removeSlide(activeFormatIndex, i)}
                    disabled={!canDelete}
                    title={canDelete ? "Delete slide" : "Can't delete the only slide"}
                    className="rounded p-1 text-[#A5A5A5] hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#A5A5A5]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div className="mx-1 h-5 w-px bg-[#E0E0E0]" />
        <button
          onClick={() => addSlide(activeFormatIndex)}
          disabled={activeFormat.slides.length >= 10}
          title={activeFormat.slides.length >= 10 ? "Max 10 slides" : "Add slide"}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#1A1A1A] hover:bg-[#F4F4F4] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* ── TOP TOOLBAR ── */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}
        className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
        {formats.length > 1 ? (
          <div className="flex items-center gap-1">
            {formats.map((f, i) => (
              <button
                key={f.name + i}
                onClick={() => setActiveFormatIndex(i)}
                className={`rounded-xl px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  i === activeFormatIndex
                    ? "bg-[#1A1A1A] text-white"
                    : "text-[#666] hover:bg-[#F4F4F4]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-2 text-[13px] font-medium text-[#1A1A1A]">{activeFormat.label}</span>
        )}
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <span className="text-[13px] tabular-nums text-[#A5A5A5] px-1">{Math.round(zoom * 100)}%</span>
        <div className="h-5 w-px bg-[#E0E0E0]" />
        <span className="text-[13px] text-[#A5A5A5] px-1">{activeFormat.width} × {activeFormat.height}</span>
        {isEdit && (
          <>
            <div className="h-5 w-px bg-[#E0E0E0]" />
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              currentStatus === "active" ? "bg-green-100 text-green-700" :
              currentStatus === "archived" ? "bg-gray-100 text-gray-600" :
              "bg-yellow-100 text-yellow-700"
            }`}>
              {currentStatus}
            </span>
          </>
        )}
      </div>

      {/* ── LEFT PANEL — Layers ── */}
      <div style={{ position: "absolute", left: 12, top: 12, bottom: 12, width: 260, zIndex: 10 }}
        className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="p-6 pb-4">
          <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1 text-[13px] text-[#A5A5A5] hover:text-[#1A1A1A] transition-colors">
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

      {/* ── CENTER CANVAS — all slides side-by-side ── */}
      <div ref={containerRef} data-viewport="bg"
        style={{ position: "absolute", left: 284, right: 324, top: 0, bottom: 0, overflow: "hidden", backgroundColor: "#EBEBEB", borderRadius: 24, margin: "12px 0" }}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <div data-viewport="bg" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div data-viewport="bg" style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
            width: rowWidth,
            height: rowHeight,
            position: "relative",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: SLIDE_GAP,
          }}>
            {/*
              Every slide is rendered as a SlideCanvas and stays mounted — including the
              active one, which keeps its Fabric preview persistent and up to date with
              store edits. The interactive mapper canvas overlays the active slot via the
              absolute-positioned wrapper below. Persistent previews ensure inactive
              slides always reflect their latest layer state.
            */}
            {activeFormat.slides.map((slide, i) => {
              const isActive = i === activeSlideIndex;
              return (
                <SlideCanvas
                  key={slide.id}
                  slide={slide}
                  format={activeFormat}
                  layerSelections={{}}
                  isActive={isActive}
                  index={i}
                  onClick={() => setActiveSlideIndex(i)}
                  onReady={() => {}}
                  registerExport={() => {}}
                />
              );
            })}

            {/* + button — spawn a new slide beside the last canvas */}
            <button
              onClick={() => addSlide(activeFormatIndex)}
              disabled={activeFormat.slides.length >= 10}
              title={activeFormat.slides.length >= 10 ? "Max 10 slides" : "Add slide"}
              style={{
                width: PLUS_SIZE,
                height: PLUS_SIZE,
                flexShrink: 0,
                borderRadius: "50%",
                border: "3px dashed #BDBDBD",
                backgroundColor: "rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                cursor: activeFormat.slides.length >= 10 ? "not-allowed" : "pointer",
                opacity: activeFormat.slides.length >= 10 ? 0.3 : 0.55,
                transition: "all 120ms ease",
                color: "#666",
              }}
            >
              <Plus style={{ width: 56, height: 56 }} />
              <span style={{ fontSize: 28, fontWeight: 600 }}>Add slide</span>
            </button>

            {/*
              Mapper canvas — stable DOM position; only its `left` shifts when the active
              slide changes. Overlays the active placeholder above. A PAD margin around
              the artboard lets Fabric's selection/resize handles render outside the
              artboard edge (handles aren't clipped by Fabric's internal clipPath).
            */}
            {(() => {
              // When an object is selected, drop all clipping — the canvas is 4000×4000,
              // so Fabric's borders and handles can render at any object size without
              // being cut off. When nothing is selected, clip horizontally so the canvas
              // doesn't cover neighbor previews and block click-to-switch-slide.
              const hasSelection = selectedLayerId !== null;
              const wrapperW = activeFormat.width + HANDLE_PAD_X * 2;
              const wrapperH = activeFormat.height;
              const innerLeft = -Math.round((4000 - activeFormat.width) / 2) + HANDLE_PAD_X;
              const innerTop = -Math.round((4000 - activeFormat.height) / 2);
              return (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: activeSlideIndex * (activeFormat.width + SLIDE_GAP) - HANDLE_PAD_X,
                    width: wrapperW,
                    height: wrapperH,
                    overflow: hasSelection ? "visible" : "hidden",
                    pointerEvents: "auto",
                    zIndex: 5,
                    transition: "left 160ms ease",
                  }}
                >
                  <div style={{ position: "absolute", width: 4000, height: 4000, left: innerLeft, top: innerTop }}>
                    <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
                  </div>
                  <div style={{
                    position: "absolute",
                    top: 16,
                    left: HANDLE_PAD_X + 16,
                    padding: "6px 12px", borderRadius: 999,
                    backgroundColor: "#1A1A1A", color: "white",
                    fontSize: 18, fontWeight: 600, letterSpacing: 0.2,
                    pointerEvents: "none", zIndex: 2,
                  }}>
                    {activeFormat.slides[activeSlideIndex]?.label ?? `Slide ${activeSlideIndex + 1}`}
                  </div>
                </div>
              );
            })()}
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

          {/* Validation + thumbnail (edit mode only) */}
          {isEdit && (
            <>
              <div className="h-px bg-[#E0E0E0]" />
              <TemplateValidation config={config} />

              <div className="space-y-2">
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={thumbBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] disabled:opacity-40 transition-all"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {thumbBusy ? "Capturing..." : "Generate Thumbnail"}
                </button>
                {thumbnail && (
                  <div className="flex items-center gap-2 text-[11px] text-[#A5A5A5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnail} alt="Thumbnail" className="h-8 w-8 rounded border object-cover" />
                    Thumbnail set
                  </div>
                )}
              </div>
            </>
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
            {currentStatus !== "active" ? (
              <button
                onClick={() => handleSave("active")}
                disabled={saving || hasErrors}
                title={hasErrors ? "Fix validation errors before publishing" : undefined}
                className="flex-1 rounded-xl bg-[#1A1A1A] px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-40 transition-all"
              >
                {saving ? "Publishing..." : "Publish"}
              </button>
            ) : (
              <button
                onClick={() => handleSave("active")}
                disabled={saving || hasErrors}
                title={hasErrors ? "Fix validation errors before publishing" : undefined}
                className="flex-1 rounded-xl bg-[#1A1A1A] px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-40 transition-all"
              >
                {saving ? "Saving..." : "Update"}
              </button>
            )}
          </div>
          {isEdit && currentStatus === "active" && (
            <button
              onClick={() => handleSave("archived")}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[12px] text-[#666] hover:border-[#D1D1D1] disabled:opacity-40 transition-all"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
