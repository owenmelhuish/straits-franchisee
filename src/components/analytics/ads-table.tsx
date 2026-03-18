"use client";

import type { AdPerformanceRow } from "@/types/analytics";

interface AdsTableProps {
  ads: AdPerformanceRow[];
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    DELETED: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export function AdsTable({ ads }: AdsTableProps) {
  if (ads.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
        No ads launched yet. Create and launch ads from a template to see performance here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Ad Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Impressions</th>
            <th className="px-4 py-3 font-medium text-right">Reach</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
            <th className="px-4 py-3 font-medium text-right">Spend</th>
            <th className="px-4 py-3 font-medium text-right">CPM</th>
            <th className="px-4 py-3 font-medium text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.adId} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{ad.adName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={ad.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ad.impressions.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ad.reach.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ad.clicks.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                ${ad.spend.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                ${ad.cpm.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {new Date(ad.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
