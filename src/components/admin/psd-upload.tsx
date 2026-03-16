"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParseStats {
  totalLayers: number;
  imagesExtracted: number;
  textLayers: number;
  rectLayers: number;
}

interface ParseResultData {
  template: { id: string };
  warnings: string[];
  stats: ParseStats;
}

export function PsdUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [parseResult, setParseResult] = useState<ParseResultData | null>(null);
  const router = useRouter();

  function deriveSlug(filename: string): string {
    return filename
      .replace(/\.(psd|psb)$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-|-$/g, "");
  }

  function deriveName(filename: string): string {
    return filename
      .replace(/\.(psd|psb)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".psd") || dropped.name.endsWith(".psb"))) {
      setFile(dropped);
      setParseResult(null);
      if (!slug) setSlug(deriveSlug(dropped.name));
      if (!name) setName(deriveName(dropped.name));
    } else {
      setError("Please upload a .psd or .psb file");
    }
  }, [slug, name]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        setFile(selected);
        setParseResult(null);
        if (!slug) setSlug(deriveSlug(selected.name));
        if (!name) setName(deriveName(selected.name));
      }
    },
    [slug, name]
  );

  async function handleUpload() {
    if (!file || !slug) return;
    setUploading(true);
    setError(null);
    setParseResult(null);
    setProgress("Parsing PSD layers...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("slug", slug);
    formData.append("name", name);

    try {
      const res = await fetch("/api/psd/parse", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }
        throw new Error(res.statusText || `Upload failed (${res.status})`);
      }

      const data: ParseResultData = await res.json();
      setParseResult(data);
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onClick={() => document.getElementById("psd-input")?.click()}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        {file ? (
          <div className="text-center">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium">Drop PSD file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
        )}
        <input
          id="psd-input"
          type="file"
          accept=".psd,.psb"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Template name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Template"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Template slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
          placeholder="my-template"
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </div>
      )}

      {/* Parse result summary */}
      {parseResult && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            PSD parsed successfully
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-muted-foreground">Total layers:</span>{" "}
              <span className="font-medium">{parseResult.stats.totalLayers}</span>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-muted-foreground">Images:</span>{" "}
              <span className="font-medium">{parseResult.stats.imagesExtracted}</span>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-muted-foreground">Text layers:</span>{" "}
              <span className="font-medium">{parseResult.stats.textLayers}</span>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-muted-foreground">Shapes:</span>{" "}
              <span className="font-medium">{parseResult.stats.rectLayers}</span>
            </div>
          </div>

          {parseResult.warnings.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {parseResult.warnings.length} warning{parseResult.warnings.length !== 1 ? "s" : ""}
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {parseResult.warnings.map((w, i) => (
                  <li key={i} className="truncate">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            type="button"
            onClick={() => router.push(`/admin/templates/${parseResult.template.id}/edit`)}
            className="w-full"
          >
            Continue to Editor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {!parseResult && (
        <Button type="button" onClick={handleUpload} disabled={!file || !slug || uploading} className="w-full">
          {uploading ? "Processing..." : "Parse & Create Template"}
        </Button>
      )}
    </div>
  );
}
