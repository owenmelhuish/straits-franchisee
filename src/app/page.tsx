"use client";

import Link from "next/link";
import { Globe } from "@/components/ui/globe";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";
import { useT } from "@/lib/i18n/client";

export default function LandingPage() {
  const t = useT();

  return (
    <div className="relative flex h-screen w-full flex-col items-center overflow-hidden bg-background">
      <div className="absolute right-6 top-6 z-20">
        <LocaleToggle variant="floating" />
      </div>

      {/* Text positioned in upper portion */}
      <div className="z-10 flex flex-col items-center pt-[15vh]">
        <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-[#1A1A1A] to-[#A5A5A5]/80 bg-clip-text text-center text-8xl font-semibold leading-none tracking-tight text-transparent dark:from-white dark:to-slate-900/10">
          {t.landing.create}
        </span>
        <Link href="/login" className="mt-8">
          <Button size="lg" className="rounded-xl bg-[#1A1A1A] px-8 text-[13px] font-medium text-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:bg-[#333333]">{t.landing.enter}</Button>
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
