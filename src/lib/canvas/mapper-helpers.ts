import { FabricImage, Textbox, Rect, FabricObject } from "fabric";
import { TemplateLayer } from "@/types/template";

const EDITABLE_PROPS = {
  selectable: true,
  evented: true,
  hasControls: true,
  hasBorders: true,
  lockMovementX: false,
  lockMovementY: false,
  cornerColor: "#4f46e5",
  cornerStrokeColor: "#4f46e5",
  borderColor: "#6366f1",
  cornerSize: 8,
  transparentCorners: false,
};

export async function createEditableFabricObject(
  layer: TemplateLayer
): Promise<FabricObject | null> {
  switch (layer.type) {
    case "image":
      return createEditableImage(layer);
    case "text":
      return createEditableText(layer);
    case "rect":
      return createEditableRect(layer);
    default:
      return null;
  }
}

async function createEditableImage(layer: TemplateLayer): Promise<FabricObject> {
  const img = await FabricImage.fromURL(layer.src!, {
    crossOrigin: "anonymous",
  });
  img.set({
    left: layer.left,
    top: layer.top,
    ...EDITABLE_PROPS,
  });
  img.scaleToWidth(layer.width);
  img.scaleToHeight(layer.height);
  img.set("data", { layerId: layer.id, type: layer.type });
  return img;
}

function createEditableText(layer: TemplateLayer): FabricObject {
  const textbox = new Textbox(layer.text || "Text", {
    left: layer.left,
    top: layer.top,
    width: layer.width,
    fontSize: layer.fontSize || 48,
    fontFamily: layer.fontFamily || "Arial",
    fontWeight: layer.fontWeight || "normal",
    fill: layer.fill || "#000000",
    textAlign: (layer.textAlign as CanvasTextAlign) || "left",
    lineHeight: layer.lineHeight || 1.2,
    splitByGrapheme: false,
    editable: false, // no inline editing — use properties panel
    ...EDITABLE_PROPS,
  });
  textbox.set("data", { layerId: layer.id, type: layer.type });
  return textbox;
}

function createEditableRect(layer: TemplateLayer): FabricObject {
  const rect = new Rect({
    left: layer.left,
    top: layer.top,
    width: layer.width,
    height: layer.height,
    fill: layer.backgroundColor || "#000000",
    opacity: layer.opacity ?? 1,
    ...EDITABLE_PROPS,
  });
  rect.set("data", { layerId: layer.id, type: layer.type });
  return rect;
}

export function createBoundingBox(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number
): FabricObject {
  const rect = new Rect({
    left: x,
    top: y,
    width: w,
    height: h,
    fill: "rgba(99, 102, 241, 0.08)",
    stroke: "#6366f1",
    strokeDashArray: [6, 4],
    strokeWidth: 2,
    ...EDITABLE_PROPS,
  });
  rect.set("data", { layerId: id, type: "text", name });
  return rect;
}
