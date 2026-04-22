"use client";

import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import { useCanvasScale } from "@/hooks/use-canvas-scale";
import { TemplateFormat } from "@/types/template";

export interface TemplatePreviewHandle {
  getCanvasDataUrl: () => string | null;
}

interface TemplatePreviewProps {
  format: TemplateFormat | null;
  slideIndex?: number;
}

export const TemplatePreview = forwardRef<TemplatePreviewHandle, TemplatePreviewProps>(
  function TemplatePreview({ format, slideIndex = 0 }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasWidth = format?.width ?? 1080;
    const canvasHeight = format?.height ?? 1920;
    const { scale } = useCanvasScale(containerRef, canvasWidth, canvasHeight);

    const layers = format?.slides[slideIndex]?.layers ?? [];
    const { canvasRef } = useCreativeCanvas({
      format,
      layers,
      layerSelections: {},
      onReady: useCallback(() => {}, []),
    });

    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        // Fabric.js canvas — try toDataURL on the fabric instance or raw element
        try {
          const el = canvas as unknown as HTMLCanvasElement;
          return el.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    }));

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
);
