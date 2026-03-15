import type { Layer } from "ag-psd";

interface ExtractedImage {
  layerName: string;
  pngBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Extracts rasterized layer images from a parsed PSD.
 * ag-psd provides layer.canvas (HTMLCanvasElement in browser, or Canvas in Node w/ canvas polyfill).
 * On the server, we use @napi-rs/canvas to convert layer imageData to PNG buffers.
 */
export async function extractLayerImages(
  layers: Layer[],
  parentName = ""
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];

  for (const layer of layers) {
    const name = layer.name || "unnamed";

    // Skip text layers — they're handled as text
    if (layer.text?.text) continue;

    // If layer has imageData (provided by ag-psd with useImageData option)
    if (layer.imageData) {
      const width = layer.imageData.width;
      const height = layer.imageData.height;

      if (width > 0 && height > 0) {
        try {
          const { createCanvas } = await import("@napi-rs/canvas");
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const imgData = ctx.createImageData(width, height);
          imgData.data.set(new Uint8ClampedArray(layer.imageData.data.buffer));
          ctx.putImageData(imgData, 0, 0);
          const pngBuffer = canvas.toBuffer("image/png");

          images.push({
            layerName: name,
            pngBuffer: Buffer.from(pngBuffer),
            width,
            height,
          });
        } catch {
          // @napi-rs/canvas not available — skip image extraction
        }
      }
    }

    // Recurse into children
    if (layer.children) {
      const childImages = await extractLayerImages(
        layer.children,
        `${parentName}${name}/`
      );
      images.push(...childImages);
    }
  }

  return images;
}

/**
 * Upload extracted images to Supabase Storage and return a map of layerName → publicUrl
 */
export async function uploadExtractedImages(
  images: ExtractedImage[],
  templateSlug: string,
  uploadFn: (buffer: Buffer, path: string, contentType: string) => Promise<string>
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  for (const img of images) {
    const safeName = img.layerName
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();
    const path = `${templateSlug}/${safeName}-${Date.now()}.png`;
    const url = await uploadFn(img.pngBuffer, path, "image/png");
    urlMap.set(img.layerName, url);
  }

  return urlMap;
}
