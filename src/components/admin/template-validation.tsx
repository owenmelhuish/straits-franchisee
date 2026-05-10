"use client";

import { TemplateConfig } from "@/types/template";
import { AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export interface ValidationIssue {
  level: "error" | "warning" | "info";
  message: string;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    String(vars[k] ?? `{${k}}`)
  );
}

/**
 * Pure issue computation. Accepts an optional `t` to localize messages.
 * Falls back to English text when called without `t` (e.g. from non-React code).
 */
export function computeValidationIssues(
  config: TemplateConfig,
  t?: Dictionary
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bankNames = new Set(config.assetBanks.map((b) => b.name));

  const labels = t?.templateValidation ?? {
    title: "Validation",
    formatHasSlides:
      'Format "{label}" has {n} slides (Meta carousel max is 10)',
    carouselNonSquare:
      '"{label}" is a carousel with a non-square aspect ratio ({w}×{h}) — Meta may crop it in some placements.',
    editableNoBank: '"{name}" ({slide}) is editable but has no linked bank',
    bankMissing: '"{name}" ({slide}) links to non-existent bank "{bank}"',
    imageNoSource: '"{name}" ({slide}) is an image layer with no source',
    bankEmpty: 'Bank "{name}" has no items',
    slideFallback: "Slide {n}",
  };

  for (const format of config.formats) {
    if (format.slides.length > 10) {
      issues.push({
        level: "error",
        message: fmt(labels.formatHasSlides, {
          label: format.label,
          n: format.slides.length,
        }),
      });
    }
    // Meta carousels work best with square creatives. Non-square carousels
    // may be cropped in some placements.
    if (format.slides.length > 1 && format.width !== format.height) {
      issues.push({
        level: "info",
        message: fmt(labels.carouselNonSquare, {
          label: format.label,
          w: format.width,
          h: format.height,
        }),
      });
    }
    for (let si = 0; si < format.slides.length; si++) {
      const slide = format.slides[si];
      const slideLabel =
        slide.label ?? fmt(labels.slideFallback, { n: si + 1 });
      for (const layer of slide.layers) {
        // Image layers with no bank can't be edited — they need a bank to swap from.
        // Text layers without a bank are valid: free-form franchisee input.
        if (layer.editable && !layer.linkedBank && layer.type !== "text") {
          issues.push({
            level: "warning",
            message: fmt(labels.editableNoBank, {
              name: layer.name,
              slide: slideLabel,
            }),
          });
        }

        if (layer.linkedBank && !bankNames.has(layer.linkedBank)) {
          issues.push({
            level: "error",
            message: fmt(labels.bankMissing, {
              name: layer.name,
              slide: slideLabel,
              bank: layer.linkedBank,
            }),
          });
        }

        if (layer.type === "image" && !layer.src && !layer.editable) {
          issues.push({
            level: "info",
            message: fmt(labels.imageNoSource, {
              name: layer.name,
              slide: slideLabel,
            }),
          });
        }
      }
    }
  }

  for (const bank of config.assetBanks) {
    if (bank.items.length === 0) {
      issues.push({
        level: "warning",
        message: fmt(labels.bankEmpty, { name: bank.name }),
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
  const t = useT();
  const issues = computeValidationIssues(config, t);

  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  // Show grouped by severity, errors first
  const grouped = [...errors, ...warnings, ...infos];

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t.templateValidation.title}
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
