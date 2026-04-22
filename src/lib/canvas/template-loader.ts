import { Canvas as FabricCanvas } from "fabric";
import { TemplateFormat, TemplateLayer } from "@/types/template";
import { LayerSelections } from "@/types/builder";
import { createFabricObject } from "./fabric-helpers";

/**
 * Load a slide's layers onto a Fabric canvas at the given format dimensions.
 * Applies any overrides from layerSelections.
 */
export async function loadLayers(
  canvas: FabricCanvas,
  format: Pick<TemplateFormat, "width" | "height">,
  layers: TemplateLayer[],
  layerSelections: LayerSelections
): Promise<void> {
  // Guard against a disposed Fabric canvas — Fabric nulls out lowerCanvasEl on dispose().
  // Callers may still hold a reference and invoke us after a StrictMode unmount/remount race.
  if (!(canvas as unknown as { lowerCanvasEl: unknown }).lowerCanvasEl) return;

  // Clear existing objects
  canvas.clear();
  canvas.setDimensions({ width: format.width, height: format.height });
  canvas.backgroundColor = "#ffffff";

  // Sort layers by zIndex
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sortedLayers) {
    // Apply selection overrides
    const effectiveLayer = { ...layer };
    const selection = layerSelections[layer.id];
    if (selection) {
      if (layer.type === "image") {
        effectiveLayer.src = selection;
      } else if (layer.type === "text") {
        effectiveLayer.text = selection;
      }
    }

    try {
      const obj = await createFabricObject(effectiveLayer);
      if (obj) {
        canvas.add(obj);
      }
    } catch (err) {
      console.error(`Failed to load layer "${layer.name}" (${layer.type}):`, err);
    }
  }

  canvas.requestRenderAll();
}

// Back-compat alias. Prefer `loadLayers`.
export const loadFormat = loadLayers;
