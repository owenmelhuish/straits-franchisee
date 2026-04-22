"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Textbox, Rect } from "fabric";
import { TemplateLayer } from "@/types/template";
import { createEditableFabricObject } from "@/lib/canvas/mapper-helpers";
import { preloadCustomFonts } from "@/lib/canvas/fonts";
import { useMapperStore } from "@/stores/mapper-store";

export function useMapperCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const initRef = useRef(false);

  const { updateLayer, setSelectedLayerId, getActiveFormat } = useMapperStore();

  // Warm-load custom web fonts (Bebas Neue, etc.) so Fabric renders them correctly.
  useEffect(() => {
    preloadCustomFonts().then(() => {
      // Force re-render once the font lands so any already-rendered Textbox picks it up.
      fabricRef.current?.requestRenderAll();
    });
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current || initRef.current) return;
    initRef.current = true;

    const format = getActiveFormat();
    // Canvas is a large fixed size; artboard is centered within it
    const CANVAS_SIZE = 4000;
    const padX = Math.round((CANVAS_SIZE - format.width) / 2);
    const padY = Math.round((CANVAS_SIZE - format.height) / 2);

    const canvas = new FabricCanvas(canvasElRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      selection: true,
      backgroundColor: "transparent",
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      controlsAboveOverlay: true,
    });

    // White artboard background
    const artboardBg = new Rect({
      left: padX,
      top: padY,
      width: format.width,
      height: format.height,
      fill: "#ffffff",
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    (artboardBg as unknown as { data: Record<string, string> }).data = { role: "artboard-bg" };
    canvas.add(artboardBg);

    // Clip object pixels to artboard (controls render above this)
    canvas.clipPath = new Rect({
      width: format.width,
      height: format.height,
      top: padY,
      left: padX,
      absolutePositioned: true,
    });

    // Store offsets for layer positioning
    (canvas as unknown as { _artboardPad: number })._artboardPad = padX;
    (canvas as unknown as { _artboardPadY: number })._artboardPadY = padY;
    (canvas as unknown as { _canvasSize: number })._canvasSize = CANVAS_SIZE;

    // Sync object modifications back to store (subtract PAD to get artboard-relative coords)
    canvas.on("object:modified", (e) => {
      const obj = e.target;
      if (!obj) return;
      const data = (obj as { data?: { layerId: string } }).data;
      if (!data?.layerId) return;

      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;
      const scaleX = obj.scaleX ?? 1;
      const scaleY = obj.scaleY ?? 1;

      const transform = {
        left: Math.round((obj.left ?? 0) - padX),
        top: Math.round((obj.top ?? 0) - padY),
        width: Math.round((obj.width ?? 0) * scaleX),
        height: Math.round((obj.height ?? 0) * scaleY),
      };

      // If a bank item is being previewed on this layer, write the transform
      // to the bank item rather than the layer's default position.
      const store = useMapperStore.getState();
      const isPreviewingItem =
        store.previewingLayerId === data.layerId && store.previewingBankItemId;
      if (isPreviewingItem) {
        const slide =
          store.formats[store.activeFormatIndex]?.slides[store.activeSlideIndex];
        const layer = slide?.layers.find((l) => l.id === data.layerId);
        if (layer?.linkedBank) {
          store.updateBankItem(layer.linkedBank, store.previewingBankItemId!, transform);
        }
      } else {
        updateLayer(data.layerId, transform);
      }

      // Reset scale after applying to width/height
      obj.set({ scaleX: 1, scaleY: 1 });
      if (obj instanceof FabricImage) {
        obj.scaleToWidth(transform.width);
        obj.scaleToHeight(transform.height);
      }
    });

    // Selection tracking
    canvas.on("selection:created", (e) => {
      const selected = e.selected?.[0];
      const data = (selected as { data?: { layerId: string } })?.data;
      if (data?.layerId) setSelectedLayerId(data.layerId);
    });

    canvas.on("selection:updated", (e) => {
      const selected = e.selected?.[0];
      const data = (selected as { data?: { layerId: string } })?.data;
      if (data?.layerId) setSelectedLayerId(data.layerId);
    });

    canvas.on("selection:cleared", () => {
      setSelectedLayerId(null);
    });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImageLayer = useCallback(
    async (url: string, name: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const id = crypto.randomUUID();
      const format = getActiveFormat();
      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;

      const layer: TemplateLayer = {
        id,
        name,
        type: "image",
        src: url,
        left: 0,
        top: 0,
        width: format.width,
        height: format.height,
        zIndex: canvas.getObjects().length,
      };

      const obj = await createEditableFabricObject({ ...layer, left: padX, top: padY });
      if (obj) {
        canvas.add(obj);
        canvas.requestRenderAll();
        useMapperStore.getState().addLayer(layer);
      }
    },
    [getActiveFormat]
  );

  const addTextBox = useCallback(
    (name: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const format = getActiveFormat();
      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;
      const id = crypto.randomUUID();

      const layer: TemplateLayer = {
        id,
        name,
        type: "text",
        text: name,
        left: format.width * 0.1,
        top: format.height * 0.4,
        width: format.width * 0.8,
        height: 100,
        fontSize: 48,
        fontFamily: "Arial",
        fontWeight: "normal",
        fill: "#000000",
        textAlign: "center",
        zIndex: canvas.getObjects().length,
      };

      const obj = createEditableFabricObjectSync({
        ...layer,
        left: layer.left + padX,
        top: layer.top + padY,
      });
      if (obj) {
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        useMapperStore.getState().addLayer(layer);
        useMapperStore.getState().setSelectedLayerId(id);
      }
    },
    [getActiveFormat]
  );

  const removeLayer = useCallback((id: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const obj = objects.find(
      (o) => (o as { data?: { layerId: string } }).data?.layerId === id
    );
    if (obj) {
      canvas.remove(obj);
      canvas.requestRenderAll();
    }
    useMapperStore.getState().removeLayer(id);
  }, []);

  const loadLayers = useCallback(async (layers: TemplateLayer[]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
    const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;

    const toRemove = canvas.getObjects().filter(
      (o) => (o as unknown as { data?: { role?: string } }).data?.role !== "artboard-bg"
    );
    toRemove.forEach((o) => canvas.remove(o));

    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      const obj = await createEditableFabricObject({ ...layer, left: layer.left + padX, top: layer.top + padY });
      if (obj) canvas.add(obj);
    }
    canvas.requestRenderAll();
  }, []);

  const resizeCanvas = useCallback((width: number, height: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const CANVAS_SIZE = (canvas as unknown as { _canvasSize: number })._canvasSize ?? 4000;
    const padX = Math.round((CANVAS_SIZE - width) / 2);
    const padY = Math.round((CANVAS_SIZE - height) / 2);

    // Update stored offsets
    (canvas as unknown as { _artboardPad: number })._artboardPad = padX;
    (canvas as unknown as { _artboardPadY: number })._artboardPadY = padY;

    // Canvas stays the same size; just move the artboard
    const bgObj = canvas.getObjects().find(
      (o) => (o as unknown as { data?: { role?: string } }).data?.role === "artboard-bg"
    );
    if (bgObj) {
      bgObj.set({ left: padX, top: padY, width, height });
    }

    canvas.clipPath = new Rect({
      width,
      height,
      top: padY,
      left: padX,
      absolutePositioned: true,
    });
    canvas.requestRenderAll();
  }, []);

  const updateCanvasObject = useCallback(
    (layerId: string, updates: Partial<TemplateLayer>) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const objects = canvas.getObjects();
      const obj = objects.find(
        (o) => (o as { data?: { layerId: string } }).data?.layerId === layerId
      );
      if (!obj) return;

      if (obj instanceof Textbox) {
        if (updates.text !== undefined) obj.set("text", updates.text);
        if (updates.fontSize !== undefined) obj.set("fontSize", updates.fontSize);
        if (updates.fontFamily !== undefined) obj.set("fontFamily", updates.fontFamily);
        if (updates.fontWeight !== undefined) obj.set("fontWeight", updates.fontWeight as string);
        if (updates.fill !== undefined) obj.set("fill", updates.fill);
        if (updates.textAlign !== undefined) obj.set("textAlign", updates.textAlign);
        if (updates.lineHeight !== undefined) obj.set("lineHeight", updates.lineHeight);
      }

      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;
      if (updates.left !== undefined) obj.set("left", updates.left + padX);
      if (updates.top !== undefined) obj.set("top", updates.top + padY);

      canvas.requestRenderAll();
    },
    []
  );

  // Preview a bank item on the canvas — replaces the image content of a layer
  // while preserving its Fabric object. When done previewing, call with original layer src.
  const previewImageOnLayer = useCallback(
    async (layerId: string, src: string, left: number, top: number, width: number, height: number) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;

      const objects = canvas.getObjects();
      const obj = objects.find(
        (o) => (o as { data?: { layerId: string } }).data?.layerId === layerId
      );

      if (obj && obj instanceof FabricImage) {
        // Replace the existing image
        const idx = objects.indexOf(obj);
        canvas.remove(obj);

        try {
          const newImg = await FabricImage.fromURL(src, { crossOrigin: "anonymous" });
          newImg.set({
            left: left + padX,
            top: top + padY,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            cornerColor: "#ffffff",
            cornerStrokeColor: "#1A1A1A",
            borderColor: "#1A1A1A",
            borderScaleFactor: 2,
            cornerSize: 14,
            cornerStyle: "circle" as const,
            transparentCorners: false,
          });
          newImg.scaleToWidth(width);
          newImg.scaleToHeight(height);
          newImg.set("data", { layerId, type: "image" });
          canvas.insertAt(idx, newImg);
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
        } catch (err) {
          console.error("Failed to preview bank item:", err);
        }
      }
    },
    []
  );

  // Get the current position/size of a layer's Fabric object (artboard-relative)
  const getLayerTransform = useCallback((layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return null;

    const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
    const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;

    const obj = canvas.getObjects().find(
      (o) => (o as { data?: { layerId: string } }).data?.layerId === layerId
    );
    if (!obj) return null;

    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    return {
      left: Math.round((obj.left ?? 0) - padX),
      top: Math.round((obj.top ?? 0) - padY),
      width: Math.round((obj.width ?? 0) * scaleX),
      height: Math.round((obj.height ?? 0) * scaleY),
    };
  }, []);

  // Preview a text bank item on the canvas — updates text content + styling
  const previewTextOnLayer = useCallback(
    (layerId: string, text: string, opts: { left?: number; top?: number; width?: number; fontSize?: number; fontFamily?: string; fontWeight?: string; fill?: string; textAlign?: string }) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
      const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;

      const obj = canvas.getObjects().find(
        (o) => (o as { data?: { layerId: string } }).data?.layerId === layerId
      );
      if (!obj || !(obj instanceof Textbox)) return;

      obj.set("text", text);
      if (opts.fontSize !== undefined) obj.set("fontSize", opts.fontSize);
      if (opts.fontFamily !== undefined) obj.set("fontFamily", opts.fontFamily);
      if (opts.fontWeight !== undefined) obj.set("fontWeight", opts.fontWeight);
      if (opts.fill !== undefined) obj.set("fill", opts.fill);
      if (opts.textAlign !== undefined) obj.set("textAlign", opts.textAlign);
      if (opts.left !== undefined) obj.set("left", opts.left + padX);
      if (opts.top !== undefined) obj.set("top", opts.top + padY);
      if (opts.width !== undefined) obj.set("width", opts.width);

      canvas.requestRenderAll();
    },
    []
  );

  // Export the artboard region as a PNG data URL (for thumbnail capture).
  const captureArtboard = useCallback((): string | null => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const padX = (canvas as unknown as { _artboardPad: number })._artboardPad ?? 0;
    const padY = (canvas as unknown as { _artboardPadY: number })._artboardPadY ?? padX;
    const format = useMapperStore.getState().getActiveFormat();
    if (!format) return null;

    const active = canvas.getActiveObject();
    if (active) canvas.discardActiveObject();
    canvas.requestRenderAll();

    const url = canvas.toDataURL({
      format: "png",
      left: padX,
      top: padY,
      width: format.width,
      height: format.height,
      multiplier: 1,
    });

    if (active) {
      canvas.setActiveObject(active);
      canvas.requestRenderAll();
    }
    return url;
  }, []);

  return {
    canvasRef: canvasElRef,
    fabricCanvas: fabricRef,
    addImageLayer,
    addTextBox,
    removeLayer,
    loadLayers,
    resizeCanvas,
    updateCanvasObject,
    previewImageOnLayer,
    previewTextOnLayer,
    getLayerTransform,
    captureArtboard,
  };
}

// Synchronous text creation (Textbox doesn't need async)
function createEditableFabricObjectSync(layer: TemplateLayer) {
  if (layer.type !== "text") return null;
  const textbox = new Textbox(layer.text || "Text", {
    left: layer.left,
    top: layer.top,
    width: layer.width,
    fontSize: layer.fontSize || 48,
    fontFamily: layer.fontFamily || "Arial",
    fontWeight: layer.fontWeight || "normal",
    fill: layer.fill || "#000000",
    textAlign: (layer.textAlign as CanvasTextAlign) || "left",
    lineHeight: layer.lineHeight || 1.2,
    splitByGrapheme: false,
    editable: false,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockMovementX: false,
    lockMovementY: false,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#1A1A1A",
    borderColor: "#1A1A1A",
    borderScaleFactor: 2,
    cornerSize: 14,
    cornerStyle: "circle" as const,
    transparentCorners: false,
  });
  textbox.set("data", { layerId: layer.id, type: layer.type });
  return textbox;
}
