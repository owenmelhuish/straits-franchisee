"use client";

import { useState } from "react";
import { STANDARD_FORMATS } from "@/lib/constants";
import { MapperShell } from "@/components/mapper/mapper-shell";

type StandardFormat = (typeof STANDARD_FORMATS)[number];

export default function NewTemplatePage() {
  const [selectedFormat, setSelectedFormat] = useState<StandardFormat | null>(
    null
  );

  if (!selectedFormat) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <h1 className="mb-2 text-center text-2xl font-bold">
            Create New Template
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Select the ad format for this template
          </p>

          <div className="grid grid-cols-3 gap-6">
            {STANDARD_FORMATS.map((fmt) => {
              const aspect = fmt.width / fmt.height;
              const previewH = 120;
              const previewW = previewH * aspect;

              return (
                <button
                  key={fmt.name}
                  onClick={() => setSelectedFormat(fmt)}
                  className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-muted-foreground/15 bg-white p-8 transition-all hover:border-primary hover:shadow-lg"
                >
                  <div
                    className="rounded-lg border border-muted-foreground/20 bg-[#F8F7F7] transition-colors group-hover:border-primary/40 group-hover:bg-primary/5"
                    style={{ width: previewW, height: previewH }}
                  />
                  <div className="text-center">
                    <p className="text-lg font-semibold">{fmt.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmt.width} &times; {fmt.height}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Create New Template</h1>
      <MapperShell initialFormat={selectedFormat} />
    </div>
  );
}
