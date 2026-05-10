"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface LocaleToggleProps {
  className?: string;
  variant?: "nav" | "floating";
}

export function LocaleToggle({ className, variant = "nav" }: LocaleToggleProps) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: "en" | "fr") {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const base =
    variant === "nav"
      ? "inline-flex items-center rounded-full bg-[#F4F4F4] p-0.5 text-[11px] font-medium"
      : "inline-flex items-center rounded-full bg-white/80 p-0.5 text-[11px] font-medium shadow-[0px_4px_20px_rgba(0,0,0,0.04)] backdrop-blur";

  const itemBase =
    "rounded-full px-2.5 py-1 transition-colors disabled:cursor-not-allowed";
  const active = "bg-white text-[#1A1A1A] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]";
  const inactive = "text-[#666666] hover:text-[#1A1A1A]";

  return (
    <div
      role="group"
      aria-label={t.toggle.ariaLabel}
      className={cn(base, className)}
    >
      <button
        type="button"
        onClick={() => pick("en")}
        disabled={pending}
        aria-pressed={locale === "en"}
        className={cn(itemBase, locale === "en" ? active : inactive)}
      >
        {t.toggle.en}
      </button>
      <button
        type="button"
        onClick={() => pick("fr")}
        disabled={pending}
        aria-pressed={locale === "fr"}
        className={cn(itemBase, locale === "fr" ? active : inactive)}
      >
        {t.toggle.fr}
      </button>
    </div>
  );
}
