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
    for (const layer of format.layers) {
      if (layer.editable && !layer.linkedBank) {
        issues.push({
          level: "warning",
          message: `"${layer.name}" is editable but has no linked bank`,
        });
      }

      if (layer.linkedBank && !bankNames.has(layer.linkedBank)) {
        issues.push({
          level: "error",
          message: `"${layer.name}" links to non-existent bank "${layer.linkedBank}"`,
        });
      }

      if (layer.type === "image" && !layer.src && !layer.editable) {
        issues.push({
          level: "info",
          message: `"${layer.name}" is an image layer with no source`,
        });
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
