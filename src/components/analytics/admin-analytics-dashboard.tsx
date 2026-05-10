"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "./metric-card";
import { DateRangePicker } from "./date-range-picker";
import { SpendTrendChart } from "./spend-trend-chart";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { AdsTable } from "./ads-table";
import { FranchiseeSelector } from "./franchisee-selector";
import type { AdminAnalyticsResponse } from "@/types/analytics";
import { useT } from "@/lib/i18n/client";

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultDateTo() {
  return new Date().toISOString().split("T")[0];
}

export function AdminAnalyticsDashboard() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [franchiseeId, setFranchiseeId] = useState("all");
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (franchiseeId !== "all") params.set("franchiseeId", franchiseeId);
      const res = await fetch(`/api/meta/insights/admin?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: AdminAnalyticsResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch admin analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, franchiseeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t.analytics.title}</h1>
        <div className="flex items-center gap-4">
          {data && data.franchisees.length > 0 && (
            <FranchiseeSelector
              franchisees={data.franchisees}
              value={franchiseeId}
              onChange={setFranchiseeId}
            />
          )}
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          {t.analytics.loading}
        </div>
      ) : data ? (
        <>
          {data.staleFranchisees.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {t.analytics.staleNotice.replace(
                "{names}",
                data.staleFranchisees.join(", ")
              )}
            </div>
          )}

          {/* Aggregate metric cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <MetricCard
              label={t.analytics.totalSpend}
              value={`$${data.summary.totalSpend.toFixed(2)}`}
            />
            <MetricCard
              label={t.analytics.impressions}
              value={data.summary.totalImpressions}
            />
            <MetricCard label={t.analytics.reach} value={data.summary.totalReach} />
            <MetricCard label={t.analytics.clicks} value={data.summary.totalClicks} />
            <MetricCard
              label={t.analytics.avgCpm}
              value={`$${data.summary.avgCpm.toFixed(2)}`}
            />
            <MetricCard label={t.analytics.adsLive} value={data.summary.adsLive} />
            <MetricCard label={t.analytics.adsCreated} value={data.summary.adsCreated} />
          </div>

          {/* Charts */}
          <SpendTrendChart data={data.daily} />
          <PerformanceTrendChart data={data.daily} />

          {/* Franchisee breakdown table */}
          {data.franchisees.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                {t.analytics.franchiseeBreakdown}
              </h2>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t.analytics.franchisee}</th>
                      <th className="px-4 py-3 font-medium text-right">
                        {t.analytics.spend}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        {t.analytics.impressions}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        {t.analytics.reach}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        {t.analytics.clicks}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">{t.analytics.ads}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.franchisees.map((f) => (
                      <tr
                        key={f.userId}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {f.name}
                          {f.stale && (
                            <span className="ml-2 text-xs text-yellow-600">
                              ({t.analytics.stale})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ${f.totalSpend.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.totalImpressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.totalReach.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.totalClicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {f.adsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top performing ads */}
          {data.topAds.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                {t.analytics.topAds}
              </h2>
              <AdsTable ads={data.topAds} />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          {t.analytics.emptyAdmin}
        </div>
      )}
    </div>
  );
}
