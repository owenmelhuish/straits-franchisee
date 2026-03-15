"use client";

import Link from "next/link";
import { Globe } from "@/components/ui/globe";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center overflow-hidden bg-background">
      {/* Text positioned in upper portion */}
      <div className="z-10 flex flex-col items-center pt-[15vh]">
        <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
          Create.
        </span>
        <Link href="/login" className="mt-6">
          <Button size="lg">Enter</Button>
        </Link>
      </div>

      {/* Globe anchored to bottom, overflowing below viewport */}
      <div className="absolute bottom-0 left-1/2 h-[132vh] w-[132vh] -translate-x-1/2 translate-y-[40%]">
        <Globe className="top-0" />
      </div>

      <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
    </div>
  );
}
