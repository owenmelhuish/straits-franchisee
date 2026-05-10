"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { FormatTabs } from "./format-tabs";
import { Plus, Minus, Maximize } from "lucide-react";
import { useT } from "@/lib/i18n/client";

interface InteractiveCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFormatChange: (index: number) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

export function InteractiveCanvas({ canvasRef, onFormatChange }: InteractiveCanvasProps) {
  const t = useT();
  const viewportRef = useRef<HTMLDivElement>(null);
  const format = useMapperStore((s) => s.formats[s.activeFormatIndex]);

  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function fitToView() {
      const vw = vp!.clientWidth;
      const vh = vp!.clientHeight;
      if (vw === 0 || vh === 0) return;
      const padding = 80;
      const s = Math.min(
        (vw - padding * 2) / format.width,
        (vh - padding * 2) / format.height,
        1
      );
      setZoom(s);
      setPan({ x: 0, y: 0 });
    }
    fitToView();
    const observer = new ResizeObserver(fitToView);
    observer.observe(vp);
    return () => observer.disconnect();
  }, [format.width, format.height, format.name]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        spaceHeld.current = true;
        if (viewportRef.current) viewportRef.current.style.cursor = "grab";
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        if (viewportRef.current && !isPanning.current) viewportRef.current.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  const handleFit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const padding = 80;
    const s = Math.min((vp.clientWidth - padding * 2) / format.width, (vp.clientHeight - padding * 2) / format.height, 1);
    setZoom(s);
    setPan({ x: 0, y: 0 });
  }, [format.width, format.height]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(Math.max(prev + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), MIN_ZOOM), MAX_ZOOM));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isBg = e.target === viewportRef.current || (e.target as HTMLElement).dataset?.viewport === "bg";
    if (e.button === 1 || spaceHeld.current || isBg) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
      if (viewportRef.current) viewportRef.current.style.cursor = "grabbing";
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: panOrigin.current.x + (e.clientX - panStart.current.x), y: panOrigin.current.y + (e.clientY - panStart.current.y) });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = spaceHeld.current ? "grab" : "";
    }
  }, []);

  return (
    <div ref={viewportRef} data-viewport="bg" className="relative h-full w-full overflow-hidden"
      onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    >
      {/* Floating format tabs — top center */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="rounded-2xl bg-white px-1.5 py-1 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <FormatTabs onFormatChange={onFormatChange} />
        </div>
      </div>

      {/* Canvas centered */}
      <div data-viewport="bg" className="absolute inset-0 flex items-center justify-center">
        <div data-viewport="bg" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center", width: format.width, height: format.height }}>
          <div style={{ width: format.width, height: format.height, backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.12)" }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Floating zoom bar — bottom center */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <button onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP * 2, MIN_ZOOM))} className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#E0E0E0] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A1A]" />
          <button onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP * 2, MAX_ZOOM))} className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <div className="h-3.5 w-px bg-[#E0E0E0]" />
          <button onClick={handleFit} className="rounded-lg p-1 text-[#A5A5A5] hover:bg-[#F4F4F4] hover:text-[#1A1A1A]" title={t.builder.fitToView}>
            <Maximize className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[28px] text-center text-[11px] tabular-nums text-[#666666]">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
