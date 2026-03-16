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

interface PropertiesPanelProps {
  onLayerUpdate: (id: string, updates: Partial<TemplateLayer>) => void;
}

export function PropertiesPanel({ onLayerUpdate }: PropertiesPanelProps) {
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

  // Collect all layers across all formats for "used by" lookup
  const allLayers = useMemo(
    () => formats.flatMap((f) => f.layers),
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
    () => (validationConfig ? computeValidationIssues(validationConfig) : []),
    [validationConfig]
  );

  const hasErrors = hasBlockingErrors(validationIssues);

  function handleLayerUpdate(id: string, updates: Partial<TemplateLayer>) {
    updateLayer(id, updates);
    onLayerUpdate(id, updates);
  }

  async function handleSave(status: "draft" | "active") {
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }

    if (status === "active" && hasErrors) {
      setError("Fix validation errors before publishing");
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
        throw new Error(data.error || "Failed to save template");
      }

      const template = await res.json();
      router.push(`/admin/templates/${template.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col border-l bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Template Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Template Info
          </h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Campaign"
              className="w-full rounded-md border px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. spring-campaign"
              className="w-full rounded-md border px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Template description..."
              rows={2}
              className="w-full rounded-md border px-2.5 py-1.5 text-sm resize-none"
            />
          </div>
        </div>

        {/* Divider */}
        <hr />

        {/* Selected Layer Properties */}
        {selectedLayer ? (
          <LayerPropertiesForm layer={selectedLayer} onUpdate={handleLayerUpdate} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Select a layer on the canvas to edit its properties.
          </p>
        )}

        {/* Divider */}
        <hr />

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
                    <span className="text-[10px] text-muted-foreground">{bank.name}:</span>
                    {usedBy.map((layerName, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
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
        <hr />

        {/* Validation */}
        {validationConfig && <TemplateValidation config={validationConfig} />}
      </div>

      {/* Save Actions */}
      <div className="border-t p-4 space-y-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSave("active")}
            disabled={saving || hasErrors}
          >
            {saving ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
