"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

interface CanvasScale {
  scale: number;
  containerWidth: number;
  containerHeight: number;
}

export function useCanvasScale(
  containerRef: RefObject<HTMLDivElement | null>,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 40
): CanvasScale {
  const [scale, setScale] = useState<CanvasScale>({
    scale: 1,
    containerWidth: 0,
    containerHeight: 0,
  });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container || canvasWidth === 0 || canvasHeight === 0) return;

    const availableWidth = container.clientWidth - padding * 2;
    const availableHeight = container.clientHeight - padding * 2;

    const newScale = Math.min(
      availableWidth / canvasWidth,
      availableHeight / canvasHeight,
      1 // never upscale
    );

    setScale({
      scale: newScale,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    });
  }, [containerRef, canvasWidth, canvasHeight, padding]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    recalculate();

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, recalculate]);

  return scale;
}
