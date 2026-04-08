"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMapperCanvas } from "@/hooks/use-mapper-canvas";
import { useMapperStore } from "@/stores/mapper-store";
import { AssetPanel } from "./asset-panel";
import { InteractiveCanvas } from "./interactive-canvas";
import { PropertiesPanel } from "./properties-panel";
import { TemplateLayer } from "@/types/template";

interface MapperShellProps {
  initialFormat?: {
    name: string;
    label: string;
    width: number;
    height: number;
  };
}

export function MapperShell({ initialFormat }: MapperShellProps) {
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
  const initialized = useRef(false);

  useEffect(() => {
    if (initialFormat && !initialized.current) {
      initialized.current = true;
      useMapperStore.setState({
        formats: [
          {
            name: initialFormat.name,
            label: initialFormat.label,
            width: initialFormat.width,
            height: initialFormat.height,
            layers: [],
          },
        ],
        activeFormatIndex: 0,
      });
      resizeCanvas(initialFormat.width, initialFormat.height);
    }
  }, [initialFormat, resizeCanvas]);

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
    <div className="flex h-full gap-3">
      {/* Left panel */}
      <div className="w-[280px] shrink-0 overflow-y-auto rounded-[24px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <AssetPanel
          onAddImage={addImageLayer}
          onAddText={addTextBox}
          onRemoveLayer={removeLayer}
        />
      </div>

      {/* Center — canvas workspace, no white wrapper */}
      <div className="flex-1 overflow-hidden rounded-[24px]" style={{ backgroundColor: "#EBEBEB" }}>
        <InteractiveCanvas
          canvasRef={canvasRef}
          onFormatChange={handleFormatChange}
        />
      </div>

      {/* Right panel */}
      <div className="w-[320px] shrink-0 overflow-y-auto rounded-[24px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <PropertiesPanel onLayerUpdate={handleLayerUpdate} />
      </div>
    </div>
  );
}
