"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCanvasScale } from "@/hooks/use-canvas-scale";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import { useBuilderStore, selectActiveFormat } from "@/stores/builder-store";
import { BuilderLayout } from "@/components/layout/builder-layout";
import { LayerPanel } from "./layer-panel";
import { FormatSwitcher } from "./format-switcher";
import { ControlsPanel } from "./controls-panel";
import { LaunchButton } from "./launch-button";
import { LaunchModal } from "./launch-modal";
import { exportToStorage } from "@/lib/canvas/export-to-storage";
import { TemplateConfig } from "@/types/template";
import { ChevronLeft } from "lucide-react";

interface BuilderViewProps {
  template: TemplateConfig;
}

export function BuilderView({ template }: BuilderViewProps) {
  const setTemplate = useBuilderStore((s) => s.setTemplate);
  const format = useBuilderStore(selectActiveFormat);
  const layerSelections = useBuilderStore((s) => s.layerSelections);
  const setCanvasReady = useBuilderStore((s) => s.setCanvasReady);
  const setExporting = useBuilderStore((s) => s.setExporting);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = format?.width ?? 1080;
  const canvasHeight = format?.height ?? 1920;
  const { scale } = useCanvasScale(containerRef, canvasWidth, canvasHeight);

  const handleReady = useCallback(() => {
    setCanvasReady(true);
  }, [setCanvasReady]);

  const { canvasRef, exportPng, getBlob } = useCreativeCanvas({
    format,
    layerSelections,
    onReady: handleReady,
  });

  // Initialize template in store
  useEffect(() => {
    setTemplate(template);
  }, [template, setTemplate]);

  // Get dev user ID from cookie
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )dev-role=([^;]*)/);
    if (match) {
      setUserId("00000000-0000-0000-0000-000000000000");
    }
  }, []);

  const handlePublish = useCallback(async () => {
    const formatName = format?.name ?? "creative";

    // Download the asset
    exportPng(`${template.slug}-${formatName}.png`);

    // Upload to storage if authenticated
    if (userId) {
      try {
        setExporting(true);
        const blob = await getBlob();
        if (blob) {
          await exportToStorage({
            blob,
            userId,
            templateId: template.id,
            templateSlug: template.slug,
            formatName,
            selections: layerSelections,
          });
        }
      } catch (err) {
        console.error("Failed to save to storage:", err);
      } finally {
        setExporting(false);
      }
    }

    setShowLaunchModal(false);
  }, [exportPng, getBlob, format, template, userId, layerSelections, setExporting]);

  // Build props for the review modal
  const editableLayers = (format?.layers ?? [])
    .filter((l) => l.editable && l.linkedBank)
    .map((l) => ({ id: l.id, name: l.name, linkedBank: l.linkedBank }));

  const bankMeta = (template.assetBanks ?? []).map((b) => ({
    name: b.name,
    type: b.type,
  }));

  return (
    <>
      <BuilderLayout
        left={
          <>
            <Link
              href="/dashboard"
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to templates
            </Link>
            <div className="mb-2">
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
            <FormatSwitcher />
            <LayerPanel />
          </>
        }
        center={
          <div ref={containerRef} className="flex h-full w-full items-center justify-center">
            <div
              className="overflow-hidden rounded-xl shadow-2xl"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${scale})`,
                transformOrigin: "center",
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>
        }
        right={
          <>
            <ControlsPanel />
            <div className="mt-auto pt-4">
              <LaunchButton onClick={() => setShowLaunchModal(true)} />
            </div>
          </>
        }
      />

      {showLaunchModal && (
        <LaunchModal
          templateName={template.name}
          formatName={format?.label ?? format?.name ?? "Default"}
          formatSize={format ? `${format.width}×${format.height}` : ""}
          selections={layerSelections}
          assetBanks={bankMeta}
          layers={editableLayers}
          onPublish={handlePublish}
          onClose={() => setShowLaunchModal(false)}
        />
      )}
    </>
  );
}
