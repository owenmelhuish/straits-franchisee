"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore, selectAllSlidesReady } from "@/stores/builder-store";
import { useT } from "@/lib/i18n/client";

interface LaunchButtonProps {
  onClick: () => void;
}

export function LaunchButton({ onClick }: LaunchButtonProps) {
  const t = useT();
  const allSlidesReady = useBuilderStore(selectAllSlidesReady);

  return (
    <Button
      onClick={onClick}
      disabled={!allSlidesReady}
      className="w-full rounded-xl bg-[#1A1A1A] text-[13px] font-medium text-white hover:bg-[#333333] disabled:opacity-40"
      size="lg"
    >
      <Rocket className="mr-2 h-4 w-4" />
      {t.builder.launch}
    </Button>
  );
}
