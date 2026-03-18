"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "./metric-card";
import { DateRangePicker } from "./date-range-picker";
import { SpendTrendChart } from "./spend-trend-chart";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { AdsTable } from "./ads-table";
import type { AnalyticsResponse } from "@/types/analytics";

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultDateTo() {
  return new Date().toISOString().split("T")[0];
}

export function AnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/meta/insights?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (res.status === 401) {
        const body = await res.json();
        if (body.needsReauth) {
          setNeedsReauth(true);
          setLoading(false);
          return;
        }
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json: AnalyticsResponse = await res.json();
      setData(json);
      setNeedsReauth(false);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (needsReauth) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold">Analytics</h1>
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-lg font-medium">Reconnect your Meta account</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Meta connection has expired or is missing the required
            permissions. Please reconnect in Settings to enable analytics.
          </p>
          <a
            href="/dashboard/settings"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading analytics...
        </div>
      ) : data ? (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Total Spend"
              value={`$${data.summary.totalSpend.toFixed(2)}`}
            />
            <MetricCard
              label="Impressions"
              value={data.summary.totalImpressions}
            />
            <MetricCard label="Reach" value={data.summary.totalReach} />
            <MetricCard label="Clicks" value={data.summary.totalClicks} />
            <MetricCard
              label="Avg CPM"
              value={`$${data.summary.avgCpm.toFixed(2)}`}
            />
            <MetricCard label="Ads Live" value={data.summary.adsLive} />
          </div>

          {/* Charts */}
          <SpendTrendChart data={data.daily} />
          <PerformanceTrendChart data={data.daily} />

          {/* Ads table */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Ad Performance</h2>
            <AdsTable ads={data.ads} />
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          No analytics data available.
        </div>
      )}
    </div>
  );
}
