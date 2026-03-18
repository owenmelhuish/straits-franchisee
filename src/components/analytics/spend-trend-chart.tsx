"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyMetrics } from "@/types/analytics";

const chartConfig = {
  spend: {
    label: "Spend",
    color: "hsl(var(--chart-1, 220 70% 50%))",
  },
} satisfies ChartConfig;

interface SpendTrendChartProps {
  data: DailyMetrics[];
}

export function SpendTrendChart({ data }: SpendTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border bg-white text-muted-foreground">
        No spend data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-medium">Spend Over Time</h3>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
            }
          />
          <Area
            dataKey="spend"
            type="monotone"
            fill="var(--color-spend)"
            fillOpacity={0.2}
            stroke="var(--color-spend)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
