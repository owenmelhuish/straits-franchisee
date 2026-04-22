"use client";

import { TemplateConfig } from "@/types/template";
import { AlertTriangle, XCircle, AlertCircle } from "lucide-react";

export interface ValidationIssue {
  level: "error" | "warning" | "info";
  message: string;
}

export function computeValidationIssues(config: TemplateConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bankNames = new Set(config.assetBanks.map((b) => b.name));

  for (const format of config.formats) {
    if (format.slides.length > 10) {
      issues.push({
        level: "error",
        message: `Format "${format.label}" has ${format.slides.length} slides (Meta carousel max is 10)`,
      });
    }
    // Meta carousels work best with square creatives. Non-square carousels
    // may be cropped in some placements.
    if (format.slides.length > 1 && format.width !== format.height) {
      issues.push({
        level: "info",
        message: `"${format.label}" is a carousel with a non-square aspect ratio (${format.width}×${format.height}) — Meta may crop it in some placements.`,
      });
    }
    for (let si = 0; si < format.slides.length; si++) {
      const slide = format.slides[si];
      const slideLabel = slide.label ?? `Slide ${si + 1}`;
      for (const layer of slide.layers) {
        // Image layers with no bank can't be edited — they need a bank to swap from.
        // Text layers without a bank are valid: free-form franchisee input.
        if (layer.editable && !layer.linkedBank && layer.type !== "text") {
          issues.push({
            level: "warning",
            message: `"${layer.name}" (${slideLabel}) is editable but has no linked bank`,
          });
        }

        if (layer.linkedBank && !bankNames.has(layer.linkedBank)) {
          issues.push({
            level: "error",
            message: `"${layer.name}" (${slideLabel}) links to non-existent bank "${layer.linkedBank}"`,
          });
        }

        if (layer.type === "image" && !layer.src && !layer.editable) {
          issues.push({
            level: "info",
            message: `"${layer.name}" (${slideLabel}) is an image layer with no source`,
          });
        }
      }
    }
  }

  for (const bank of config.assetBanks) {
    if (bank.items.length === 0) {
      issues.push({
        level: "warning",
        message: `Bank "${bank.name}" has no items`,
      });
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

interface TemplateValidationProps {
  config: TemplateConfig;
}

const icons = {
  error: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
  info: <AlertCircle className="h-4 w-4 shrink-0 text-blue-400" />,
};

const bgColors = {
  error: "bg-red-50 border-red-200",
  warning: "bg-amber-50 border-amber-200",
  info: "bg-blue-50 border-blue-200",
};

export function TemplateValidation({ config }: TemplateValidationProps) {
  const issues = computeValidationIssues(config);

  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  // Show grouped by severity, errors first
  const grouped = [...errors, ...warnings, ...infos];

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Validation
      </h4>
      {grouped.map((issue, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-md border px-3 py-1.5 text-xs ${bgColors[issue.level]}`}
        >
          {icons[issue.level]}
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
