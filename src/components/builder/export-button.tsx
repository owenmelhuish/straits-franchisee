"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBuilderStore,
  selectActiveFormat,
  selectAllSlidesReady,
} from "@/stores/builder-store";
import { useT } from "@/lib/i18n/client";

interface ExportButtonProps {
  onExport: () => void;
}

export function ExportButton({ onExport }: ExportButtonProps) {
  const t = useT();
  const isExporting = useBuilderStore((s) => s.isExporting);
  const allSlidesReady = useBuilderStore(selectAllSlidesReady);
  const format = useBuilderStore(selectActiveFormat);

  return (
    <Button
      onClick={onExport}
      disabled={isExporting || !allSlidesReady}
      className="w-full"
      size="lg"
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting
        ? t.builder.exporting
        : `${t.builder.exportPng}${format ? ` (${format.width}×${format.height})` : ""}`}
    </Button>
  );
}
