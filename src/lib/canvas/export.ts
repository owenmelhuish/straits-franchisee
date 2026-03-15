import { Canvas as FabricCanvas } from "fabric";
import { EXPORT_SETTINGS } from "@/lib/constants";

export function exportCanvasToPng(
  canvas: FabricCanvas,
  filename: string = "creative-export.png"
): void {
  const dataURL = canvas.toDataURL({
    format: EXPORT_SETTINGS.FORMAT,
    quality: EXPORT_SETTINGS.QUALITY,
    multiplier: EXPORT_SETTINGS.MULTIPLIER,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function canvasToBlob(canvas: FabricCanvas): Promise<Blob> {
  const dataURL = canvas.toDataURL({
    format: EXPORT_SETTINGS.FORMAT,
    quality: EXPORT_SETTINGS.QUALITY,
    multiplier: EXPORT_SETTINGS.MULTIPLIER,
  });

  return fetch(dataURL).then((res) => res.blob());
}
