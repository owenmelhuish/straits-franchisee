"use client";

import { useBuilderStore } from "@/stores/builder-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FormatSwitcher() {
  const template = useBuilderStore((s) => s.template);
  const activeFormatIndex = useBuilderStore((s) => s.activeFormatIndex);
  const setActiveFormat = useBuilderStore((s) => s.setActiveFormat);

  if (!template) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-[#A5A5A5] uppercase tracking-wider">
        Format
      </p>
      <Tabs
        value={String(activeFormatIndex)}
        onValueChange={(v) => setActiveFormat(Number(v))}
      >
        <TabsList className="w-full">
          {template.formats.map((fmt, i) => (
            <TabsTrigger key={fmt.name} value={String(i)} className="flex-1 text-xs">
              {fmt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
