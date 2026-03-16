"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Textbox } from "fabric";
import { TemplateLayer } from "@/types/template";
import { createEditableFabricObject } from "@/lib/canvas/mapper-helpers";
import { useMapperStore } from "@/stores/mapper-store";

export function useMapperCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const initRef = useRef(false);

  const { updateLayer, setSelectedLayerId, getActiveFormat } = useMapperStore();

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current || initRef.current) return;
    initRef.current = true;

    const format = getActiveFormat();
    const canvas = new FabricCanvas(canvasElRef.current, {
      width: format.width,
      height: format.height,
      selection: true,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      renderOnAddRemove: true,
    });

    // Sync object modifications back to store
    canvas.on("object:modified", (e) => {
      const obj = e.target;
      if (!obj) return;
      const data = (obj as { data?: { layerId: string } }).data;
      if (!data?.layerId) return;

      const scaleX = obj.scaleX ?? 1;
      const scaleY = obj.scaleY ?? 1;

      updateLayer(data.layerId, {
        left: Math.round(obj.left ?? 0),
        top: Math.round(obj.top ?? 0),
        width: Math.round((obj.width ?? 0) * scaleX),
        height: Math.round((obj.height ?? 0) * scaleY),
      });

      // Reset scale after applying to width/height
      obj.set({ scaleX: 1, scaleY: 1 });
      // For images we need to re-apply the scale as actual dimensions
      if (obj instanceof FabricImage) {
        obj.scaleToWidth(Math.round((obj.width ?? 0) * scaleX));
        obj.scaleToHeight(Math.round((obj.height ?? 0) * scaleY));
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

      const obj = await createEditableFabricObject(layer);
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

      const obj = createEditableFabricObjectSync(layer);
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

  const loadFormatLayers = useCallback(async (layers: TemplateLayer[]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";

    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      const obj = await createEditableFabricObject(layer);
      if (obj) canvas.add(obj);
    }
    canvas.requestRenderAll();
  }, []);

  const resizeCanvas = useCallback((width: number, height: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width, height });
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
      }

      if (updates.left !== undefined) obj.set("left", updates.left);
      if (updates.top !== undefined) obj.set("top", updates.top);

      canvas.requestRenderAll();
    },
    []
  );

  return {
    canvasRef: canvasElRef,
    fabricCanvas: fabricRef,
    addImageLayer,
    addTextBox,
    removeLayer,
    loadFormatLayers,
    resizeCanvas,
    updateCanvasObject,
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
    cornerColor: "#4f46e5",
    cornerStrokeColor: "#4f46e5",
    borderColor: "#6366f1",
    cornerSize: 8,
    transparentCorners: false,
  });
  textbox.set("data", { layerId: layer.id, type: layer.type });
  return textbox;
}
