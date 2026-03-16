"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { FormatTabs } from "./format-tabs";
import { Plus, Minus, Maximize } from "lucide-react";

interface InteractiveCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFormatChange: (index: number) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

export function InteractiveCanvas({ canvasRef, onFormatChange }: InteractiveCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const format = useMapperStore((s) => s.formats[s.activeFormatIndex]);

  // Pan & zoom state
  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  // Calculate fit scale and center on mount / format change
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    function fitToView() {
      const vw = vp!.clientWidth;
      const vh = vp!.clientHeight;
      if (vw === 0 || vh === 0) return;

      const padding = 60;
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

  // Fit to view
  const handleFit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const padding = 60;
    const s = Math.min(
      (vp.clientWidth - padding * 2) / format.width,
      (vp.clientHeight - padding * 2) / format.height,
      1
    );
    setZoom(s);
    setPan({ x: 0, y: 0 });
  }, [format.width, format.height]);

  // Wheel zoom (no modifier needed — scroll to zoom, like design tools)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  // Pan: middle-click drag OR space+drag — we'll use mousedown on the viewport background
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan if clicking the viewport background (not the canvas)
      // or if middle mouse button
      const isMiddle = e.button === 1;
      const isBackground =
        e.target === viewportRef.current ||
        (e.target as HTMLElement).dataset?.viewport === "bg";

      if (isMiddle || isBackground) {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...pan };
        (viewportRef.current as HTMLElement).style.cursor = "grabbing";
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({
      x: panOrigin.current.x + dx,
      y: panOrigin.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) {
        viewportRef.current.style.cursor = "";
      }
    }
  }, []);

  // Slider change
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar: format tabs + zoom % */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <FormatTabs onFormatChange={onFormatChange} />
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleFit}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Fit to view"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Viewport — the infinite pannable workspace */}
      <div
        ref={viewportRef}
        data-viewport="bg"
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundColor: "#fafafa",
          backgroundImage:
            "radial-gradient(circle, rgba(234,142,54,0.25) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          cursor: "grab",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformed canvas container */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div
            style={{
              width: format.width,
              height: format.height,
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="rounded shadow-2xl"
              style={{
                width: format.width,
                height: format.height,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.12)",
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical zoom slider — left side */}
      <div className="absolute bottom-6 left-3 flex flex-col items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP * 2, MAX_ZOOM))}
          className="rounded border bg-white p-1 text-muted-foreground shadow-sm hover:bg-gray-50 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="relative flex h-32 items-center">
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={handleSlider}
            className="absolute h-32 w-6 cursor-pointer appearance-none bg-transparent accent-orange-400"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
            }}
          />
        </div>
        <button
          onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP * 2, MIN_ZOOM))}
          className="rounded border bg-white p-1 text-muted-foreground shadow-sm hover:bg-gray-50 hover:text-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="mt-1 text-[10px] tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
