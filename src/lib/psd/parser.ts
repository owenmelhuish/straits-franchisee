import { readPsd } from "ag-psd";
import type { Layer } from "ag-psd";
import { TemplateConfig, TemplateFormat, TemplateLayer } from "@/types/template";
import { mapPsdLayer, resetLayerCounter } from "./layer-mapper";
import { extractLayerImages, uploadExtractedImages } from "./image-extractor";

interface ParseOptions {
  uploadFn: (buffer: Buffer, path: string, contentType: string) => Promise<string>;
  slug: string;
  name?: string;
}

export interface ParseStats {
  totalLayers: number;
  imagesExtracted: number;
  textLayers: number;
  rectLayers: number;
}

export interface ParseResult {
  config: TemplateConfig;
  warnings: string[];
  stats: ParseStats;
}

export async function parsePsdToTemplateConfig(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<ParseResult> {
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

  // Extract and upload layer images (returns index-keyed map)
  const { images: extractedImages, warnings: extractionWarnings } =
    await extractLayerImages(psd.children ?? []);
  const imageUrlMap = await uploadExtractedImages(
    extractedImages,
    options.slug,
    options.uploadFn
  );

  // Collect warnings as strings
  const warnings: string[] = extractionWarnings.map(
    (w) => `Layer "${w.layerName}": ${w.reason}`
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

      const flatLayers = flattenLayers(artboard.children ?? []);
      const layers = flatLayers.map(
        (item, zIdx) => mapPsdLayer(item.layer, zIdx, imageUrlMap, item.flatIndex)
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
    const flatLayers = flattenLayers(psd.children ?? []);
    const layers = flatLayers.map(
      (item, zIdx) => mapPsdLayer(item.layer, zIdx, imageUrlMap, item.flatIndex)
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

  // Compute stats
  const allLayers = formats.flatMap((f) => f.layers);
  const stats: ParseStats = {
    totalLayers: allLayers.length,
    imagesExtracted: allLayers.filter((l) => l.type === "image" && l.src).length,
    textLayers: allLayers.filter((l) => l.type === "text").length,
    rectLayers: allLayers.filter((l) => l.type === "rect").length,
  };

  const displayName =
    options.name ||
    options.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const config: TemplateConfig = {
    id: crypto.randomUUID(),
    name: displayName,
    slug: options.slug,
    description: "",
    thumbnail: "",
    formats,
    assetBanks: [],
  };

  return { config, warnings, stats };
}

interface FlatLayerItem {
  layer: Layer;
  flatIndex: number;
}

function flattenLayers(
  layers: Layer[],
  state: { index: number } = { index: 0 }
): FlatLayerItem[] {
  const result: FlatLayerItem[] = [];
  for (const layer of layers) {
    // Skip hidden layers
    if (layer.hidden) continue;

    if (layer.children && !layer.artboard) {
      result.push(...flattenLayers(layer.children, state));
    } else {
      result.push({ layer, flatIndex: state.index });
      state.index++;
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
