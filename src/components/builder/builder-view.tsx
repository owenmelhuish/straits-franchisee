"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useCanvasScale } from "@/hooks/use-canvas-scale";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import { useBuilderStore, selectActiveFormat } from "@/stores/builder-store";
import { BuilderLayout } from "@/components/layout/builder-layout";
import { LayerPanel } from "./layer-panel";
import { FormatSwitcher } from "./format-switcher";
import { ControlsPanel } from "./controls-panel";
import { LaunchButton } from "./launch-button";
import { LaunchModal, CampaignData } from "./launch-modal";
import { exportToStorage } from "@/lib/canvas/export-to-storage";
import { toast } from "sonner";
import { TemplateConfig } from "@/types/template";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
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
  const isExporting = useBuilderStore((s) => s.isExporting);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  // Warn before leaving with unsaved changes
  const defaultSelections = useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const fmt of template.formats) {
      for (const layer of fmt.layers) {
        if (!layer.editable || !layer.linkedBank) continue;
        const value = layer.type === "image" ? layer.src : layer.text;
        if (value) defaults[layer.id] = value;
      }
    }
    return defaults;
  }, [template]);

  const hasUnsavedChanges =
    JSON.stringify(layerSelections) !== JSON.stringify(defaultSelections);
  useUnsavedChangesWarning(hasUnsavedChanges);

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

  const handlePublish = useCallback(async (campaign: CampaignData) => {
    const formatName = format?.name ?? "creative";

    // Download the asset
    exportPng(`${template.slug}-${formatName}.png`);

    // Upload to storage if authenticated
    if (userId) {
      try {
        setExporting(true);
        const blob = await getBlob();
        if (!blob) throw new Error("Failed to generate image");
        const result = await exportToStorage({
          blob,
          userId,
          templateId: template.id,
          templateSlug: template.slug,
          templateName: template.name,
          formatName,
          selections: layerSelections,
          campaign,
        });
        toast.success(
          result.metaAdId
            ? "Published to Meta Ads!"
            : "Campaign published successfully!",
          {
            description: result.metaAdId
              ? "Your ad has been created in PAUSED status. Review it in Meta Ads Manager."
              : "Your creative has been exported and saved.",
          }
        );
      } catch (err) {
        console.error("Failed to save to storage:", err);
        toast.error("Failed to save campaign", {
          description: "Your creative was downloaded but could not be saved to the server.",
        });
      } finally {
        setExporting(false);
      }
    } else {
      toast.success("Creative exported!", {
        description: "Your PNG has been downloaded.",
      });
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
          isPublishing={isExporting}
          onPublish={handlePublish}
          onClose={() => setShowLaunchModal(false)}
        />
      )}
    </>
  );
}
