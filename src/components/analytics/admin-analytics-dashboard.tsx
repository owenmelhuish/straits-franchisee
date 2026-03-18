"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "./metric-card";
import { DateRangePicker } from "./date-range-picker";
import { SpendTrendChart } from "./spend-trend-chart";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { AdsTable } from "./ads-table";
import { FranchiseeSelector } from "./franchisee-selector";
import type { AdminAnalyticsResponse } from "@/types/analytics";

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultDateTo() {
  return new Date().toISOString().split("T")[0];
}

export function AdminAnalyticsDashboard() {
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
        <h1 className="text-2xl font-bold">Analytics</h1>
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
          Loading analytics...
        </div>
      ) : data ? (
        <>
          {data.staleFranchisees.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Stale tokens for: {data.staleFranchisees.join(", ")}. These
              franchisees need to reconnect their Meta accounts.
            </div>
          )}

          {/* Aggregate metric cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
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
            <MetricCard label="Ads Created" value={data.summary.adsCreated} />
          </div>

          {/* Charts */}
          <SpendTrendChart data={data.daily} />
          <PerformanceTrendChart data={data.daily} />

          {/* Franchisee breakdown table */}
          {data.franchisees.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Franchisee Breakdown
              </h2>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Franchisee</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Spend
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Impressions
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Reach
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Clicks
                      </th>
                      <th className="px-4 py-3 font-medium text-right">Ads</th>
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
                              (stale)
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
                Top Performing Ads
              </h2>
              <AdsTable ads={data.topAds} />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          No franchisees have connected Meta accounts yet.
        </div>
      )}
    </div>
  );
}
