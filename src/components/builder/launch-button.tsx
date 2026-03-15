"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/stores/builder-store";

interface LaunchButtonProps {
  onClick: () => void;
}

export function LaunchButton({ onClick }: LaunchButtonProps) {
  const isCanvasReady = useBuilderStore((s) => s.isCanvasReady);

  return (
    <Button
      onClick={onClick}
      disabled={!isCanvasReady}
      className="w-full"
      size="lg"
    >
      <Rocket className="mr-2 h-4 w-4" />
      Launch
    </Button>
  );
}
