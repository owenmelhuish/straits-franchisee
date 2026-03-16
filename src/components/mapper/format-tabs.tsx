"use client";

import { useMapperStore } from "@/stores/mapper-store";
import { cn } from "@/lib/utils";

interface FormatTabsProps {
  onFormatChange: (index: number) => void;
}

export function FormatTabs({ onFormatChange }: FormatTabsProps) {
  const { formats, activeFormatIndex, setActiveFormatIndex } = useMapperStore();

  function handleSwitch(index: number) {
    setActiveFormatIndex(index);
    onFormatChange(index);
  }

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {formats.map((format, i) => (
        <button
          key={format.name}
          onClick={() => handleSwitch(i)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            i === activeFormatIndex
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}
