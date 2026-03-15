"use client";

import { ReactNode } from "react";

interface BuilderLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function BuilderLayout({ left, center, right }: BuilderLayoutProps) {
  return (
    <div className="grid h-screen grid-cols-[280px_1fr_320px] bg-[#F8F7F7]">
      <aside className="flex flex-col gap-4 overflow-y-auto border-r border-border/50 bg-white p-4">
        {left}
      </aside>
      <main className="flex items-center justify-center overflow-hidden p-6">
        {center}
      </main>
      <aside className="flex flex-col gap-4 overflow-y-auto border-l border-border/50 bg-white p-4">
        {right}
      </aside>
    </div>
  );
}
