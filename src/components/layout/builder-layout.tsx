"use client";

import { ReactNode } from "react";

interface BuilderLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  toolbar?: ReactNode;
}

export function BuilderLayout({ left, center, right, toolbar }: BuilderLayoutProps) {
  return (
    <div className="flex h-screen bg-[#F4F4F4] p-3 gap-3">
      {/* Left panel */}
      <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {left}
      </aside>

      {/* Center — gray workspace with canvas */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[24px]" style={{ backgroundColor: "#EBEBEB" }}>
        {toolbar && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
            {toolbar}
          </div>
        )}
        {center}
      </main>

      {/* Right panel */}
      <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {right}
      </aside>
    </div>
  );
}
