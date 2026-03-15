import { FabricImage, Textbox, Rect, FabricObject } from "fabric";
import { TemplateLayer } from "@/types/template";

const LOCKED_PROPS = {
  selectable: false,
  evented: false,
  hasControls: false,
  lockMovementX: true,
  lockMovementY: true,
};

export async function createFabricObject(
  layer: TemplateLayer
): Promise<FabricObject | null> {
  switch (layer.type) {
    case "image":
      return createImage(layer);
    case "text":
      return createText(layer);
    case "rect":
      return createRect(layer);
    default:
      return null;
  }
}

async function createImage(layer: TemplateLayer): Promise<FabricObject> {
  const img = await FabricImage.fromURL(layer.src!, {
    crossOrigin: "anonymous",
  });
  img.set({
    left: layer.left,
    top: layer.top,
    ...LOCKED_PROPS,
  });
  // Scale to fit specified dimensions
  img.scaleToWidth(layer.width);
  img.scaleToHeight(layer.height);
  img.set("data", { layerId: layer.id, type: layer.type });
  return img;
}

function createText(layer: TemplateLayer): FabricObject {
  const textbox = new Textbox(layer.text || "", {
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
    ...LOCKED_PROPS,
  });
  textbox.set("data", { layerId: layer.id, type: layer.type });
  return textbox;
}

function createRect(layer: TemplateLayer): FabricObject {
  const rect = new Rect({
    left: layer.left,
    top: layer.top,
    width: layer.width,
    height: layer.height,
    fill: layer.backgroundColor || "#000000",
    opacity: layer.opacity ?? 1,
    ...LOCKED_PROPS,
  });
  rect.set("data", { layerId: layer.id, type: layer.type });
  return rect;
}
