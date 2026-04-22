"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Textbox } from "fabric";
import { TemplateFormat, TemplateLayer } from "@/types/template";
import { LayerSelections } from "@/types/builder";
import { loadLayers } from "@/lib/canvas/template-loader";
import { exportCanvasToPng, canvasToBlob } from "@/lib/canvas/export";
import { preloadCustomFonts } from "@/lib/canvas/fonts";
import { CANVAS_DEFAULTS } from "@/lib/constants";

interface UseCreativeCanvasOptions {
  format: TemplateFormat | null;
  layers: TemplateLayer[];
  layerSelections: LayerSelections;
  onReady?: () => void;
}

export function useCreativeCanvas({
  format,
  layers,
  layerSelections,
  onReady,
}: UseCreativeCanvasOptions) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const layersRef = useRef<TemplateLayer[] | null>(null);
  const formatDimsRef = useRef<{ w: number; h: number } | null>(null);
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

  // (Re)load layers when the layers array or format dims change
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !format) return;

    // Skip if nothing meaningful changed
    const sameLayers = layersRef.current === layers;
    const sameDims =
      formatDimsRef.current?.w === format.width && formatDimsRef.current?.h === format.height;
    if (sameLayers && sameDims) return;

    layersRef.current = layers;
    formatDimsRef.current = { w: format.width, h: format.height };

    // Wait for custom web fonts to finish loading so text renders in the correct face.
    // Use a cancel flag so that if the component unmounts (Fabric disposed) between
    // scheduling and the async `then`, we don't call clear() / render on a dead canvas.
    let cancelled = false;
    preloadCustomFonts().then(() => {
      if (cancelled) return;
      if (fabricRef.current !== canvas) return; // canvas was recreated or disposed
      loadLayers(canvas, format, layers, selectionsRef.current).then(() => {
        if (cancelled) return;
        if (fabricRef.current !== canvas) return;
        onReady?.();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [format, layers, onReady]);

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
          const layer = layers.find((l) => l.id === data.layerId);
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
            }).catch((err) => {
              console.error(`Failed to load image for layer "${layer.name}":`, err);
            });
          }
        }
      }
    }

    canvas.requestRenderAll();
  }, [layerSelections, format, layers]);

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
