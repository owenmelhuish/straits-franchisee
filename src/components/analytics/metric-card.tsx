"use client";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  prefix?: string;
}

export function MetricCard({ label, value, prefix }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {prefix}
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </CardContent>
    </Card>
  );
}
