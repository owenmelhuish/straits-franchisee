"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMapperStore } from "@/stores/mapper-store";
import { templateConfigToRow } from "@/types/database";
import { LayerPropertiesForm } from "./layer-properties-form";
import { BankEditor } from "@/components/admin/bank-editor";
import {
  TemplateValidation,
  computeValidationIssues,
  hasBlockingErrors,
} from "@/components/admin/template-validation";
import { Button } from "@/components/ui/button";
import { TemplateLayer } from "@/types/template";
import { useT } from "@/lib/i18n/client";

interface PropertiesPanelProps {
  onLayerUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
}

export function PropertiesPanel({ onLayerUpdate }: PropertiesPanelProps) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    name,
    slug,
    description,
    setName,
    setSlug,
    setDescription,
    assetBanks,
    setAssetBanks,
    formats,
    getSelectedLayer,
    toTemplateConfig,
    updateLayer,
  } = useMapperStore();

  const selectedLayer = getSelectedLayer();

  // Collect all layers across all formats and slides for "used by" lookup
  const allLayers = useMemo(
    () => formats.flatMap((f) => f.slides.flatMap((s) => s.layers)),
    [formats]
  );

  // Build a map of bankName → layer names that reference it
  const bankUsageMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const layer of allLayers) {
      if (layer.linkedBank) {
        const existing = map.get(layer.linkedBank) || [];
        existing.push(layer.name);
        map.set(layer.linkedBank, existing);
      }
    }
    return map;
  }, [allLayers]);

  // Build validation config for live checking
  const validationConfig = useMemo(() => {
    try {
      return toTemplateConfig();
    } catch {
      return null;
    }
  }, [name, slug, description, formats, assetBanks, toTemplateConfig]);

  const validationIssues = useMemo(
    () => (validationConfig ? computeValidationIssues(validationConfig, t) : []),
    [validationConfig, t]
  );

  const hasErrors = hasBlockingErrors(validationIssues);

  function handleLayerUpdate(id: string, updates: Partial<TemplateLayer>) {
    updateLayer(id, updates);
    onLayerUpdate(id, updates);
  }

  async function handleSave(status: "draft" | "active") {
    if (!name.trim() || !slug.trim()) {
      setError(t.templateCreator.nameSlugRequired);
      return;
    }

    if (status === "active" && hasErrors) {
      setError(t.templateCreator.fixErrorsBeforePublish);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const config = toTemplateConfig();
      const payload = {
        name: config.name,
        slug: config.slug,
        description: config.description,
        status,
        config: {
          formats: config.formats,
          assetBanks: config.assetBanks,
        },
      };

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.templateCreator.saveFailed);
      }

      const template = await res.json();
      router.push(`/admin/templates/${template.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.templateCreator.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Template Metadata */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#A5A5A5]">
            {t.templateCreator.templateInfo}
          </h3>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">{t.templateCreator.name}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.templateCreator.namePlaceholder}
              className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">{t.templateCreator.slug}</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t.templateCreator.slugPlaceholder}
              className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#A5A5A5]">
              {t.templateCreator.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.templateCreator.descriptionPlaceholder}
              rows={2}
              className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A5A5A5] focus:border-[#D1D1D1] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E0E0E0]" />

        {/* Selected Layer Properties */}
        {selectedLayer ? (
          <LayerPropertiesForm layer={selectedLayer} onUpdate={handleLayerUpdate} />
        ) : (
          <p className="text-[13px] text-[#A5A5A5]">
            {t.templateCreator.selectLayerHint}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-[#E0E0E0]" />

        {/* Bank Editor with usage indicators */}
        <div className="space-y-4">
          <BankEditor banks={assetBanks} onBanksChange={setAssetBanks} />

          {/* "Used by" indicators below each bank */}
          {assetBanks.length > 0 && (
            <div className="space-y-1">
              {assetBanks.map((bank) => {
                const usedBy = bankUsageMap.get(bank.name);
                if (!usedBy || usedBy.length === 0) return null;
                return (
                  <div key={bank.id} className="flex flex-wrap items-center gap-1 px-1">
                    <span className="text-[10px] text-[#A5A5A5]">{bank.name}:</span>
                    {usedBy.map((layerName, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#F4F4F4] px-2 py-0.5 text-[10px] font-medium text-[#666666]"
                      >
                        {layerName}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E0E0E0]" />

        {/* Validation */}
        {validationConfig && <TemplateValidation config={validationConfig} />}
      </div>

      {/* Save Actions */}
      <div className="border-t border-[#E0E0E0] p-4 space-y-2">
        {error && (
          <p className="text-[11px] text-red-500">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl border border-[#E0E0E0] bg-white px-3 py-2 text-[13px] font-medium text-[#1A1A1A] transition-all hover:border-[#D1D1D1] hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] disabled:opacity-40"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            {saving ? t.templateCreator.saving : t.templateCreator.saveDraft}
          </button>
          <button
            className="flex-1 rounded-xl bg-[#1A1A1A] px-3 py-2 text-[13px] font-medium text-white transition-all hover:bg-[#333333] disabled:opacity-40"
            onClick={() => handleSave("active")}
            disabled={saving || hasErrors}
          >
            {saving ? t.templateCreator.publishing : t.templateCreator.publish}
          </button>
        </div>
      </div>
    </div>
  );
}
