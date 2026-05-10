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
import { useT, useLocale } from "@/lib/i18n/client";

interface PerformanceTrendChartProps {
  data: DailyMetrics[];
}

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  const t = useT();
  const locale = useLocale();
  const dateLocale = locale === "fr" ? "fr-CA" : "en-US";

  const chartConfig = {
    impressions: {
      label: t.analytics.impressions,
      color: "hsl(var(--chart-1, 220 70% 50%))",
    },
    reach: {
      label: t.analytics.reach,
      color: "hsl(var(--chart-2, 160 60% 45%))",
    },
    clicks: {
      label: t.analytics.clicks,
      color: "hsl(var(--chart-3, 30 80% 55%))",
    },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border bg-white text-muted-foreground">
        {t.analytics.noPerformance}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-medium">{t.analytics.performanceOverTime}</h3>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString(dateLocale, {
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
                  new Date(v).toLocaleDateString(dateLocale, {
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
