"use client";

import { useCallback, useRef } from "react";
import { useMapperStore } from "@/stores/mapper-store";
import { Image, Type, Trash2, ChevronUp, ChevronDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AssetPanelProps {
  onAddImage: (url: string, name: string) => void;
  onAddText: (name: string) => void;
  onRemoveLayer: (id: string) => void;
}

export function AssetPanel({ onAddImage, onAddText, onRemoveLayer }: AssetPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    getActiveLayers,
    selectedLayerId,
    setSelectedLayerId,
    reorderLayers,
  } = useMapperStore();

  const layers = getActiveLayers();

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "templates");
      formData.append("path", `mapper/${Date.now()}-${file.name}`);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const { url } = await res.json();
          const name = file.name.replace(/\.[^.]+$/, "");
          onAddImage(url, name);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onAddImage]
  );

  return (
    <div className="flex h-full flex-col border-r bg-white">
      <div className="border-b p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Image
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onAddText("Headline")}
          >
            <Type className="mr-1.5 h-3.5 w-3.5" />
            Text Box
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {layers.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            Upload an image or add a text box to get started.
          </p>
        )}
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => setSelectedLayerId(layer.id)}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
              selectedLayerId === layer.id
                ? "bg-indigo-50 text-indigo-900"
                : "hover:bg-muted"
            )}
          >
            {layer.type === "image" ? (
              <Image className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{layer.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index > 0) reorderLayers(index, index - 1);
                }}
                className="rounded p-0.5 hover:bg-accent"
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (index < layers.length - 1) reorderLayers(index, index + 1);
                }}
                className="rounded p-0.5 hover:bg-accent"
                disabled={index === layers.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLayer(layer.id);
                }}
                className="rounded p-0.5 hover:bg-accent text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
