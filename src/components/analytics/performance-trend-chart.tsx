"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyMetrics } from "@/types/analytics";

const chartConfig = {
  impressions: {
    label: "Impressions",
    color: "hsl(var(--chart-1, 220 70% 50%))",
  },
  reach: {
    label: "Reach",
    color: "hsl(var(--chart-2, 160 60% 45%))",
  },
  clicks: {
    label: "Clicks",
    color: "hsl(var(--chart-3, 30 80% 55%))",
  },
} satisfies ChartConfig;

interface PerformanceTrendChartProps {
  data: DailyMetrics[];
}

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border bg-white text-muted-foreground">
        No performance data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-medium">Performance Over Time</h3>
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
          <YAxis tickLine={false} axisLine={false} />
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
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            dataKey="impressions"
            type="monotone"
            fill="var(--color-impressions)"
            fillOpacity={0.1}
            stroke="var(--color-impressions)"
            strokeWidth={2}
          />
          <Area
            dataKey="reach"
            type="monotone"
            fill="var(--color-reach)"
            fillOpacity={0.1}
            stroke="var(--color-reach)"
            strokeWidth={2}
          />
          <Area
            dataKey="clicks"
            type="monotone"
            fill="var(--color-clicks)"
            fillOpacity={0.1}
            stroke="var(--color-clicks)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
