import { readPsd } from "ag-psd";
import type { Layer } from "ag-psd";
import { TemplateConfig, TemplateFormat, TemplateLayer } from "@/types/template";
import { mapPsdLayer, resetLayerCounter } from "./layer-mapper";
import { extractLayerImages, uploadExtractedImages } from "./image-extractor";

interface ParseOptions {
  uploadFn: (buffer: Buffer, path: string, contentType: string) => Promise<string>;
  slug: string;
}

export async function parsePsdToTemplateConfig(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<TemplateConfig> {
  // Initialize ag-psd for Node.js (no DOM canvas)
  const helpers = await import("ag-psd/dist/helpers");
  try {
    const { createCanvas: napiCreateCanvas } = await import("@napi-rs/canvas");
    helpers.initializeCanvas(
      (w: number, h: number) => napiCreateCanvas(w, h) as unknown as HTMLCanvasElement
    );
  } catch {
    // If @napi-rs/canvas unavailable, ag-psd will skip canvas-dependent features
  }

  const psd = readPsd(new Uint8Array(buffer), {
    useImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });

  resetLayerCounter();

  // Extract and upload layer images
  const extractedImages = await extractLayerImages(psd.children ?? []);
  const imageUrlMap = await uploadExtractedImages(
    extractedImages,
    options.slug,
    options.uploadFn
  );

  // Check for artboards
  const artboards = (psd.children ?? []).filter(
    (layer) => layer.artboard || (layer.children && layer.children.length > 0 && hasArtboardBounds(layer))
  );

  let formats: TemplateFormat[];

  if (artboards.length > 1) {
    // Multiple artboards → each becomes a format
    formats = artboards.map((artboard, idx) => {
      const left = artboard.left ?? 0;
      const top = artboard.top ?? 0;
      const width = (artboard.right ?? psd.width) - left;
      const height = (artboard.bottom ?? psd.height) - top;

      const layers = flattenLayers(artboard.children ?? []).map(
        (layer, zIdx) => mapPsdLayer(layer, zIdx, imageUrlMap)
      ).filter(Boolean) as TemplateLayer[];

      // Offset layers relative to artboard origin
      for (const layer of layers) {
        layer.left -= left;
        layer.top -= top;
      }

      return {
        name: artboard.name || `format-${idx + 1}`,
        label: artboard.name || `Format ${idx + 1}`,
        width,
        height,
        layers,
      };
    });
  } else {
    // Single PSD → one format
    const layers = flattenLayers(psd.children ?? []).map(
      (layer, zIdx) => mapPsdLayer(layer, zIdx, imageUrlMap)
    ).filter(Boolean) as TemplateLayer[];

    formats = [
      {
        name: "default",
        label: `Default (${psd.width}x${psd.height})`,
        width: psd.width,
        height: psd.height,
        layers,
      },
    ];
  }

  return {
    id: crypto.randomUUID(),
    name: options.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: options.slug,
    description: "",
    thumbnail: "",
    formats,
    assetBanks: [],
  };
}

function flattenLayers(layers: Layer[]): Layer[] {
  const result: Layer[] = [];
  for (const layer of layers) {
    if (layer.children && !layer.artboard) {
      result.push(...flattenLayers(layer.children));
    } else if (!layer.children || layer.children.length === 0) {
      result.push(layer);
    } else {
      result.push(layer);
    }
  }
  return result;
}

function hasArtboardBounds(layer: Layer): boolean {
  return (
    layer.left !== undefined &&
    layer.top !== undefined &&
    layer.right !== undefined &&
    layer.bottom !== undefined &&
    (layer.right - layer.left) > 0 &&
    (layer.bottom - layer.top) > 0
  );
}
