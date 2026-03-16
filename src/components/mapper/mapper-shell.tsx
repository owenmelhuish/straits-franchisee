"use client";

import { useCallback } from "react";
import { useMapperCanvas } from "@/hooks/use-mapper-canvas";
import { useMapperStore } from "@/stores/mapper-store";
import { AssetPanel } from "./asset-panel";
import { InteractiveCanvas } from "./interactive-canvas";
import { PropertiesPanel } from "./properties-panel";
import { TemplateLayer } from "@/types/template";

export function MapperShell() {
  const {
    canvasRef,
    addImageLayer,
    addTextBox,
    removeLayer,
    loadFormatLayers,
    resizeCanvas,
    updateCanvasObject,
  } = useMapperCanvas();

  const formats = useMapperStore((s) => s.formats);

  const handleFormatChange = useCallback(
    (index: number) => {
      const format = formats[index];
      resizeCanvas(format.width, format.height);
      loadFormatLayers(format.layers);
    },
    [formats, resizeCanvas, loadFormatLayers]
  );

  const handleLayerUpdate = useCallback(
    (id: string, updates: Partial<TemplateLayer>) => {
      updateCanvasObject(id, updates);
    },
    [updateCanvasObject]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Left Panel */}
      <div className="w-72 shrink-0">
        <AssetPanel
          onAddImage={addImageLayer}
          onAddText={addTextBox}
          onRemoveLayer={removeLayer}
        />
      </div>

      {/* Center Panel */}
      <div className="flex-1">
        <InteractiveCanvas
          canvasRef={canvasRef}
          onFormatChange={handleFormatChange}
        />
      </div>

      {/* Right Panel */}
      <div className="w-80 shrink-0">
        <PropertiesPanel onLayerUpdate={handleLayerUpdate} />
      </div>
    </div>
  );
}
