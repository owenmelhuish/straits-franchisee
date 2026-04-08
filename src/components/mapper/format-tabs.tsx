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
    <div className="flex gap-0.5 rounded-xl bg-[#F4F4F4] p-1">
      {formats.map((format, i) => (
        <button
          key={format.name}
          onClick={() => handleSwitch(i)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
            i === activeFormatIndex
              ? "bg-white text-[#1A1A1A] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]"
              : "text-[#A5A5A5] hover:text-[#666666]"
          )}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}
