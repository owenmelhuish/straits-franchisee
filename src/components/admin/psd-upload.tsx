"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PsdUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const router = useRouter();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".psd") || dropped.name.endsWith(".psb"))) {
      setFile(dropped);
      if (!slug) {
        setSlug(
          dropped.name
            .replace(/\.(psd|psb)$/i, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .toLowerCase()
        );
      }
    } else {
      setError("Please upload a .psd or .psb file");
    }
  }, [slug]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        setFile(selected);
        if (!slug) {
          setSlug(
            selected.name
              .replace(/\.(psd|psb)$/i, "")
              .replace(/[^a-zA-Z0-9]+/g, "-")
              .toLowerCase()
          );
        }
      }
    },
    [slug]
  );

  async function handleUpload() {
    if (!file || !slug) return;
    setUploading(true);
    setError(null);
    setProgress("Parsing PSD layers...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("slug", slug);

    try {
      const res = await fetch("/api/psd/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const template = await res.json();
      setProgress("Redirecting to editor...");
      router.push(`/admin/templates/${template.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
        <label className="mb-1 block text-sm font-medium">Template slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-template"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </div>
      )}

      <Button onClick={handleUpload} disabled={!file || !slug || uploading} className="w-full">
        {uploading ? "Processing..." : "Parse & Create Template"}
      </Button>
    </div>
  );
}
