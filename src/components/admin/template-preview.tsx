"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import { useCanvasScale } from "@/hooks/use-canvas-scale";
import { TemplateFormat } from "@/types/template";

interface TemplatePreviewProps {
  format: TemplateFormat | null;
}

export function TemplatePreview({ format }: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWidth = format?.width ?? 1080;
  const canvasHeight = format?.height ?? 1920;
  const { scale } = useCanvasScale(containerRef, canvasWidth, canvasHeight);

  const { canvasRef } = useCreativeCanvas({
    format,
    layerSelections: {},
    onReady: useCallback(() => {}, []),
  });

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      {format ? (
        <div
          className="overflow-hidden rounded-lg shadow-lg"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No format to preview</p>
      )}
    </div>
  );
}
