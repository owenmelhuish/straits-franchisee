"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TemplateRow, templateRowToConfig } from "@/types/database";
import { TemplateConfig, TemplateLayer, AssetBank } from "@/types/template";
import { LayerReviewList } from "@/components/admin/layer-review-list";
import { BankEditor } from "@/components/admin/bank-editor";
import { TemplatePreview } from "@/components/admin/template-preview";
import {
  TemplateValidation,
  computeValidationIssues,
  hasBlockingErrors,
} from "@/components/admin/template-validation";
import { Button } from "@/components/ui/button";
import { Save, Eye, Archive, Camera } from "lucide-react";

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
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const previewRef = useRef<{ getCanvasDataUrl: () => string | null }>(null);

  // Fetch template
  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((res) => res.json())
      .then((data: TemplateRow) => {
        setRow(data);
        const cfg = templateRowToConfig(data);
        // Migrate banks without IDs
        cfg.assetBanks = cfg.assetBanks.map((bank) => ({
          ...bank,
          id: bank.id || crypto.randomUUID(),
        }));
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

  function createBank(bankName: string, type: "image" | "text") {
    if (!config) return;
    // Check if bank already exists
    if (config.assetBanks.some((b) => b.name === bankName)) return;
    const newBank: AssetBank = {
      id: crypto.randomUUID(),
      name: bankName,
      type,
      items: [],
    };
    setConfig({ ...config, assetBanks: [...config.assetBanks, newBank] });
  }

  async function handleGenerateThumbnail() {
    if (!previewRef.current || !config) return;
    setThumbnailGenerating(true);
    setError(null);

    try {
      const dataUrl = previewRef.current.getCanvasDataUrl();
      if (!dataUrl) throw new Error("Could not capture canvas");

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("file", blob, `${slug}-thumbnail.png`);
      formData.append("bucket", "templates");
      formData.append("path", `thumbnails/${slug}.png`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Thumbnail upload failed");

      const { url } = await uploadRes.json();
      setConfig({ ...config, thumbnail: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate thumbnail");
    } finally {
      setThumbnailGenerating(false);
    }
  }

  async function handleSave(newStatus?: "active" | "archived") {
    if (!config) return;

    // Block publish if there are validation errors
    if (newStatus === "active") {
      const issues = computeValidationIssues(config);
      if (hasBlockingErrors(issues)) {
        setError("Fix validation errors before publishing");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name,
        slug,
        description,
        thumbnail_url: config.thumbnail || undefined,
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
  const validationIssues = computeValidationIssues(config);
  const hasErrors = hasBlockingErrors(validationIssues);

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
            assetBanks={config.assetBanks}
            onLayerUpdate={updateLayer}
            onCreateBank={createBank}
          />
        )}
      </div>

      {/* Center: Preview */}
      <div className="flex-1 overflow-hidden rounded-xl border bg-white">
        <TemplatePreview ref={previewRef} format={activeFormat} />
      </div>

      {/* Right: Bank editor + validation + actions */}
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-white p-4">
        <TemplateValidation config={config} />

        <BankEditor banks={config.assetBanks} onBanksChange={updateBanks} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateThumbnail}
            disabled={thumbnailGenerating}
            className="w-full"
          >
            <Camera className="mr-2 h-4 w-4" />
            {thumbnailGenerating ? "Capturing..." : "Generate Thumbnail"}
          </Button>

          {config.thumbnail && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <img
                src={config.thumbnail}
                alt="Thumbnail"
                className="h-8 w-8 rounded border object-cover"
              />
              Thumbnail set
            </div>
          )}

          <Button type="button" onClick={() => handleSave()} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>

          {row?.status !== "active" && (
            <Button
              type="button"
              onClick={() => handleSave("active")}
              disabled={saving || hasErrors}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              title={hasErrors ? "Fix validation errors before publishing" : undefined}
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}

          {row?.status === "active" && (
            <Button
              type="button"
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
