import type { Layer } from "ag-psd";
import { TemplateLayer } from "@/types/template";

let layerCounter = 0;

export function resetLayerCounter() {
  layerCounter = 0;
}

export function mapPsdLayer(
  layer: Layer,
  zIndex: number,
  imageUrlMap: Map<number, string>,
  flatIndex: number
): TemplateLayer | null {
  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  const right = layer.right ?? left;
  const bottom = layer.bottom ?? top;
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) return null;

  const id = `layer-${++layerCounter}`;
  const name = layer.name || `Layer ${layerCounter}`;
  const opacity = layer.opacity !== undefined ? layer.opacity / 255 : 1;

  // Text layer
  if (layer.text?.text) {
    const style = layer.text.style;
    return {
      id,
      name,
      type: "text",
      left,
      top,
      width,
      height,
      text: layer.text.text,
      fontSize: style?.fontSize ?? 24,
      fontFamily: style?.font?.name ?? "Arial",
      fontWeight: (style as { fontWeight?: string })?.fontWeight ?? "normal",
      fill: colorToHex(style?.fillColor) ?? "#000000",
      textAlign: "left",
      opacity: opacity < 1 ? opacity : undefined,
      editable: false,
      zIndex,
    };
  }

  // Check if we have a rasterized image for this layer (keyed by flat index)
  const imageUrl = imageUrlMap.get(flatIndex);
  if (imageUrl || layer.canvas) {
    return {
      id,
      name,
      type: "image",
      left,
      top,
      width,
      height,
      src: imageUrl || "",
      opacity: opacity < 1 ? opacity : undefined,
      editable: false,
      zIndex,
    };
  }

  // Solid fill / vector layer → rect
  if (layer.vectorFill || layer.vectorMask) {
    return {
      id,
      name,
      type: "rect",
      left,
      top,
      width,
      height,
      backgroundColor: colorToHex(layer.vectorFill) ?? "#cccccc",
      opacity: opacity < 1 ? opacity : undefined,
      editable: false,
      zIndex,
    };
  }

  // Fallback: if layer has canvas data, treat as image
  return {
    id,
    name,
    type: "rect",
    left,
    top,
    width,
    height,
    backgroundColor: "#cccccc",
    opacity: opacity < 1 ? opacity : undefined,
    editable: false,
    zIndex,
  };
}

function colorToHex(color: unknown): string | null {
  if (!color) return null;
  if (typeof color === "string") return color;
  const c = color as { r?: number; g?: number; b?: number };
  if (c.r !== undefined && c.g !== undefined && c.b !== undefined) {
    const r = Math.round(c.r * 255)
      .toString(16)
      .padStart(2, "0");
    const g = Math.round(c.g * 255)
      .toString(16)
      .padStart(2, "0");
    const b = Math.round(c.b * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return null;
}
