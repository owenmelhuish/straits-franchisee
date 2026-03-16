import type { Layer } from "ag-psd";

export interface ExtractedImage {
  flatIndex: number;
  layerName: string;
  pngBuffer: Buffer;
  width: number;
  height: number;
}

export interface ExtractionWarning {
  layerName: string;
  reason: string;
}

// One-time module-level canvas availability check
let _createCanvas: typeof import("@napi-rs/canvas").createCanvas | null = null;
let _canvasChecked = false;

async function getCreateCanvas() {
  if (!_canvasChecked) {
    _canvasChecked = true;
    try {
      const mod = await import("@napi-rs/canvas");
      _createCanvas = mod.createCanvas;
    } catch {
      _createCanvas = null;
    }
  }
  return _createCanvas;
}

/**
 * Extracts rasterized layer images from a parsed PSD.
 * Uses layer.canvas (from ag-psd initializeCanvas) as primary path,
 * falls back to manual imageData conversion via @napi-rs/canvas.
 * Returns images keyed by flat index + any warnings for failed extractions.
 */
export async function extractLayerImages(
  layers: Layer[],
  parentName = "",
  state: { flatIndex: number } = { flatIndex: 0 }
): Promise<{ images: ExtractedImage[]; warnings: ExtractionWarning[] }> {
  const images: ExtractedImage[] = [];
  const warnings: ExtractionWarning[] = [];
  const createCanvas = await getCreateCanvas();

  for (const layer of layers) {
    const name = layer.name || "unnamed";

    // Skip hidden layers
    if (layer.hidden) continue;

    // Skip text layers — they're handled as text
    if (layer.text?.text) {
      state.flatIndex++;
      continue;
    }

    const currentIndex = state.flatIndex;
    state.flatIndex++;

    // Primary path: use layer.canvas if ag-psd populated it via initializeCanvas
    if (layer.canvas) {
      try {
        const c = layer.canvas as unknown as { toBuffer: (mime: string) => Buffer | Uint8Array; width: number; height: number };
        const pngBuffer = c.toBuffer("image/png");
        images.push({
          flatIndex: currentIndex,
          layerName: name,
          pngBuffer: Buffer.from(pngBuffer),
          width: c.width,
          height: c.height,
        });
        // Recurse into children if any
        if (layer.children) {
          const childResult = await extractLayerImages(layer.children, `${parentName}${name}/`, state);
          images.push(...childResult.images);
          warnings.push(...childResult.warnings);
        }
        continue;
      } catch (err) {
        warnings.push({
          layerName: name,
          reason: `layer.canvas toBuffer failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        // Fall through to imageData path
      }
    }

    // Fallback: manual imageData → @napi-rs/canvas conversion
    if (layer.imageData && createCanvas) {
      const width = layer.imageData.width;
      const height = layer.imageData.height;

      if (width > 0 && height > 0) {
        try {
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const imgData = ctx.createImageData(width, height);
          imgData.data.set(new Uint8ClampedArray(layer.imageData.data.buffer));
          ctx.putImageData(imgData, 0, 0);
          const pngBuffer = canvas.toBuffer("image/png");

          images.push({
            flatIndex: currentIndex,
            layerName: name,
            pngBuffer: Buffer.from(pngBuffer),
            width,
            height,
          });
        } catch (err) {
          warnings.push({
            layerName: name,
            reason: `imageData conversion failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    } else if (layer.imageData && !createCanvas) {
      warnings.push({
        layerName: name,
        reason: "@napi-rs/canvas not available — cannot convert imageData to PNG",
      });
    }

    // Recurse into children
    if (layer.children) {
      const childResult = await extractLayerImages(
        layer.children,
        `${parentName}${name}/`,
        state
      );
      images.push(...childResult.images);
      warnings.push(...childResult.warnings);
    }
  }

  return { images, warnings };
}

/**
 * Upload extracted images to Supabase Storage and return a map of flatIndex → publicUrl
 */
export async function uploadExtractedImages(
  images: ExtractedImage[],
  templateSlug: string,
  uploadFn: (buffer: Buffer, path: string, contentType: string) => Promise<string>
): Promise<Map<number, string>> {
  const urlMap = new Map<number, string>();

  for (const img of images) {
    const safeName = img.layerName
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();
    const path = `${templateSlug}/${safeName}-${img.flatIndex}-${Date.now()}.png`;
    const url = await uploadFn(img.pngBuffer, path, "image/png");
    urlMap.set(img.flatIndex, url);
  }

  return urlMap;
}
