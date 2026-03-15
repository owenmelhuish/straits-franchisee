"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Textbox } from "fabric";
import { TemplateFormat } from "@/types/template";
import { LayerSelections } from "@/types/builder";
import { loadFormat } from "@/lib/canvas/template-loader";
import { exportCanvasToPng, canvasToBlob } from "@/lib/canvas/export";
import { CANVAS_DEFAULTS } from "@/lib/constants";

interface UseCreativeCanvasOptions {
  format: TemplateFormat | null;
  layerSelections: LayerSelections;
  onReady?: () => void;
}

export function useCreativeCanvas({
  format,
  layerSelections,
  onReady,
}: UseCreativeCanvasOptions) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const formatRef = useRef<TemplateFormat | null>(null);
  const selectionsRef = useRef<LayerSelections>(layerSelections);

  // Keep selections ref in sync
  selectionsRef.current = layerSelections;

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const canvas = new FabricCanvas(canvasElRef.current, {
      width: format?.width || 1080,
      height: format?.height || 1920,
      selection: CANVAS_DEFAULTS.SELECTION,
      backgroundColor: CANVAS_DEFAULTS.BACKGROUND_COLOR,
      renderOnAddRemove: false,
    });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // Only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load format when it changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !format) return;

    // Skip if same format
    if (formatRef.current === format) return;
    formatRef.current = format;

    loadFormat(canvas, format, selectionsRef.current).then(() => {
      onReady?.();
    });
  }, [format, onReady]);

  // Sync individual selection changes (without full reload)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !format) return;

    const objects = canvas.getObjects();

    for (const obj of objects) {
      const data = (obj as { data?: { layerId: string; type: string } }).data;
      if (!data?.layerId) continue;

      const selectedValue = layerSelections[data.layerId];
      if (!selectedValue) continue;

      if (data.type === "text" && obj instanceof Textbox) {
        if (obj.text !== selectedValue) {
          obj.set("text", selectedValue);
        }
      } else if (data.type === "image" && obj instanceof FabricImage) {
        const currentSrc = obj.getSrc();
        if (currentSrc !== selectedValue && !currentSrc.endsWith(selectedValue)) {
          // Need to replace the image
          const layer = format.layers.find((l) => l.id === data.layerId);
          if (layer) {
            FabricImage.fromURL(selectedValue, {
              crossOrigin: "anonymous",
            }).then((newImg) => {
              newImg.set({
                left: layer.left,
                top: layer.top,
                selectable: false,
                evented: false,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
              });
              newImg.scaleToWidth(layer.width);
              newImg.scaleToHeight(layer.height);
              newImg.set("data", { layerId: layer.id, type: layer.type });

              // Replace in same position
              const idx = objects.indexOf(obj);
              canvas.remove(obj);
              canvas.insertAt(idx, newImg);
              canvas.requestRenderAll();
            });
          }
        }
      }
    }

    canvas.requestRenderAll();
  }, [layerSelections, format]);

  const handleExport = useCallback((filename?: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    exportCanvasToPng(canvas, filename);
  }, []);

  const handleGetBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    return canvasToBlob(canvas);
  }, []);

  return {
    canvasRef: canvasElRef,
    fabricCanvas: fabricRef,
    exportPng: handleExport,
    getBlob: handleGetBlob,
  };
}
