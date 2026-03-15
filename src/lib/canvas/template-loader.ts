import { Canvas as FabricCanvas } from "fabric";
import { TemplateFormat } from "@/types/template";
import { LayerSelections } from "@/types/builder";
import { createFabricObject } from "./fabric-helpers";

/**
 * Load all layers from a template format onto a Fabric canvas.
 * Applies any overrides from layerSelections.
 */
export async function loadFormat(
  canvas: FabricCanvas,
  format: TemplateFormat,
  layerSelections: LayerSelections
): Promise<void> {
  // Clear existing objects
  canvas.clear();
  canvas.setDimensions({ width: format.width, height: format.height });
  canvas.backgroundColor = "#ffffff";

  // Sort layers by zIndex
  const sortedLayers = [...format.layers].sort((a, b) => a.zIndex - b.zIndex);

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
