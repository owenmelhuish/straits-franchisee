"use client";

import { useEffect, useMemo } from "react";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import { TemplateFormat, TemplateSlide } from "@/types/template";
import { LayerSelections } from "@/types/builder";
import { useT } from "@/lib/i18n/client";

export interface SlideExportFns {
  exportPng: (filename?: string) => void;
  getBlob: () => Promise<Blob | null>;
}

interface SlideCanvasProps {
  slide: TemplateSlide;
  format: TemplateFormat;
  layerSelections: LayerSelections;
  isActive: boolean;
  index: number;
  onClick: () => void;
  onReady: () => void;
  registerExport: (slideId: string, fns: SlideExportFns) => void;
}

export function SlideCanvas({
  slide,
  format,
  layerSelections,
  isActive,
  index,
  onClick,
  onReady,
  registerExport,
}: SlideCanvasProps) {
  const t = useT();
  // Keep the layers reference stable so the canvas hook doesn't thrash
  const layers = useMemo(() => slide.layers, [slide.layers]);

  const { canvasRef, exportPng, getBlob } = useCreativeCanvas({
    format,
    layers,
    layerSelections,
    onReady,
  });

  useEffect(() => {
    registerExport(slide.id, { exportPng, getBlob });
  }, [slide.id, exportPng, getBlob, registerExport]);

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer"
      style={{
        width: format.width,
        height: format.height,
        borderRadius: 16,
        overflow: "hidden",
        opacity: isActive ? 1 : 0.45,
        boxShadow: isActive
          ? "0 0 0 4px #1A1A1A, 0 20px 60px rgba(0,0,0,0.18)"
          : "0 0 0 1px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.10)",
        transition: "box-shadow 120ms ease, opacity 160ms ease",
      }}
    >
      <canvas ref={canvasRef} />
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "6px 12px",
          borderRadius: 999,
          backgroundColor: isActive ? "#1A1A1A" : "rgba(255,255,255,0.9)",
          color: isActive ? "white" : "#1A1A1A",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 0.2,
          pointerEvents: "none",
        }}
      >
        {slide.label ?? t.templateCreator.slideFallback.replace("{n}", String(index + 1))}
      </div>
    </div>
  );
}
