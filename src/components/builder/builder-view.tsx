"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useCanvasScale } from "@/hooks/use-canvas-scale";
import { useCreativeCanvas } from "@/hooks/use-creative-canvas";
import {
  useBuilderStore,
  selectActiveFormat,
  selectActiveSlide,
} from "@/stores/builder-store";
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
import { ChevronLeft, Download } from "lucide-react";
import { useT } from "@/lib/i18n/client";

interface BuilderViewProps {
  template: TemplateConfig;
}

export function BuilderView({ template }: BuilderViewProps) {
  const t = useT();
  const setTemplate = useBuilderStore((s) => s.setTemplate);
  const format = useBuilderStore(selectActiveFormat);
  const activeSlide = useBuilderStore(selectActiveSlide);
  const layerSelections = useBuilderStore((s) => s.layerSelections);
  const markSlideReady = useBuilderStore((s) => s.markSlideReady);
  const setExporting = useBuilderStore((s) => s.setExporting);
  const isExporting = useBuilderStore((s) => s.isExporting);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  const defaultSelections = useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const fmt of template.formats) {
      for (const slide of fmt.slides) {
        for (const layer of slide.layers) {
          if (!layer.editable || !layer.linkedBank) continue;
          const value = layer.type === "image" ? layer.src : layer.text;
          if (value) defaults[layer.id] = value;
        }
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

  const activeSlideId = activeSlide?.id ?? null;
  const activeSlideLayers = useMemo(() => activeSlide?.layers ?? [], [activeSlide]);
  const handleReady = useCallback(() => {
    if (activeSlideId) markSlideReady(activeSlideId, true);
  }, [activeSlideId, markSlideReady]);

  const { canvasRef, exportPng, getBlob } = useCreativeCanvas({
    format,
    layers: activeSlideLayers,
    layerSelections,
    onReady: handleReady,
  });

  useEffect(() => {
    setTemplate(template);
  }, [template, setTemplate]);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )dev-role=([^;]*)/);
    if (match) {
      setUserId("00000000-0000-0000-0000-000000000000");
    }
  }, []);

  const handlePublish = useCallback(
    async (campaign: CampaignData) => {
      const formatName = format?.name ?? "creative";
      exportPng(`${template.slug}-${formatName}.png`);

      if (userId) {
        try {
          setExporting(true);
          const blob = await getBlob();
          if (!blob) throw new Error("Failed to generate image");
          const result = await exportToStorage({
            blobs: [blob],
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
              ? t.builder.publishedToMeta
              : t.builder.campaignPublished,
            {
              description: result.metaAdId
                ? t.builder.publishedMetaDesc
                : t.builder.publishedSavedDesc,
            }
          );
        } catch (err) {
          console.error("Failed to save to storage:", err);
          toast.error(t.builder.saveCampaignFailed, {
            description: t.builder.saveCampaignFailedDesc,
          });
        } finally {
          setExporting(false);
        }
      } else {
        toast.success(t.builder.creativeExported, {
          description: t.builder.pngDownloaded,
        });
      }

      setShowLaunchModal(false);
    },
    [exportPng, getBlob, format, template, userId, layerSelections, setExporting, t]
  );

  const editableLayers = activeSlideLayers
    .filter((l) => l.editable && l.linkedBank)
    .map((l) => ({ id: l.id, name: l.name, linkedBank: l.linkedBank }));

  const bankMeta = (template.assetBanks ?? []).map((b) => ({
    name: b.name,
    type: b.type,
  }));

  return (
    <>
      <BuilderLayout
        toolbar={
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
            <span className="text-[13px] font-medium text-[#666666]">
              {format?.label ?? ""}
            </span>
            <div className="h-4 w-px bg-[#E0E0E0]" />
            <span className="text-[13px] tabular-nums text-[#A5A5A5]">
              {Math.round(scale * 100)}%
            </span>
            <div className="h-4 w-px bg-[#E0E0E0]" />
            <button
              onClick={() =>
                exportPng(
                  `${template.slug}-${format?.name ?? "creative"}.png`
                )
              }
              className="flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#333333]"
            >
              <Download className="h-3.5 w-3.5" />
              {t.builder.export}
            </button>
          </div>
        }
        left={
          <>
            <Link
              href="/dashboard"
              className="mb-4 flex items-center gap-1 text-[13px] text-[#A5A5A5] transition-colors hover:text-[#1A1A1A]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t.builder.back}
            </Link>
            <div className="mb-1">
              <h2 className="text-[16px] font-semibold text-[#1A1A1A]">
                {template.name}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#666666]">
                {template.description}
              </p>
            </div>

            <div className="mb-2 mt-4">
              <FormatSwitcher />
            </div>

            <div className="mt-2">
              <LayerPanel />
            </div>
          </>
        }
        center={
          <div
            ref={containerRef}
            className="flex h-full w-full items-center justify-center"
          >
            <div
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${scale})`,
                transformOrigin: "center",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow:
                  "0 0 0 1px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.10)",
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
