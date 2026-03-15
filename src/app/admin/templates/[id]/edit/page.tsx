"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TemplateRow, templateRowToConfig } from "@/types/database";
import { TemplateConfig, TemplateLayer, AssetBank } from "@/types/template";
import { LayerReviewList } from "@/components/admin/layer-review-list";
import { BankEditor } from "@/components/admin/bank-editor";
import { TemplatePreview } from "@/components/admin/template-preview";
import { Button } from "@/components/ui/button";
import { Save, Eye, Archive } from "lucide-react";

export default function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<TemplateRow | null>(null);
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [activeFormatIdx, setActiveFormatIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch template
  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((res) => res.json())
      .then((data: TemplateRow) => {
        setRow(data);
        const cfg = templateRowToConfig(data);
        setConfig(cfg);
        setName(cfg.name);
        setSlug(cfg.slug);
        setDescription(cfg.description);
      })
      .catch(() => setError("Failed to load template"));
  }, [id]);

  function updateLayer(layerId: string, updates: Partial<TemplateLayer>) {
    if (!config) return;
    const newFormats = config.formats.map((fmt) => ({
      ...fmt,
      layers: fmt.layers.map((l) =>
        l.id === layerId ? { ...l, ...updates } : l
      ),
    }));
    setConfig({ ...config, formats: newFormats });
  }

  function updateBanks(banks: AssetBank[]) {
    if (!config) return;
    setConfig({ ...config, assetBanks: banks });
  }

  async function handleSave(newStatus?: "active" | "archived") {
    if (!config) return;
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name,
        slug,
        description,
        config: {
          formats: config.formats,
          assetBanks: config.assetBanks,
        },
      };
      if (newStatus) body.status = newStatus;

      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Save failed");

      const updated = await res.json();
      setRow(updated);

      if (newStatus === "active") {
        router.push("/admin/templates");
      }
    } catch {
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="flex h-64 items-center justify-center">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">Loading template...</p>
        )}
      </div>
    );
  }

  const activeFormat = config.formats[activeFormatIdx] ?? null;

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4">
      {/* Left: Layer list */}
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-white p-4">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {config.formats.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium">Format</label>
            <select
              value={activeFormatIdx}
              onChange={(e) => setActiveFormatIdx(Number(e.target.value))}
              className="w-full rounded border px-2 py-1.5 text-sm"
            >
              {config.formats.map((fmt, i) => (
                <option key={i} value={i}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeFormat && (
          <LayerReviewList
            layers={activeFormat.layers}
            onLayerUpdate={updateLayer}
          />
        )}
      </div>

      {/* Center: Preview */}
      <div className="flex-1 overflow-hidden rounded-xl border bg-white">
        <TemplatePreview format={activeFormat} />
      </div>

      {/* Right: Bank editor + actions */}
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-white p-4">
        <BankEditor banks={config.assetBanks} onBanksChange={updateBanks} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2 border-t pt-4">
          <Button onClick={() => handleSave()} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>

          {row?.status !== "active" && (
            <Button
              onClick={() => handleSave("active")}
              disabled={saving}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}

          {row?.status === "active" && (
            <Button
              onClick={() => handleSave("archived")}
              disabled={saving}
              variant="outline"
              className="w-full"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
