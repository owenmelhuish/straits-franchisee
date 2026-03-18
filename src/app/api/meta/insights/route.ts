import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAdInsights } from "@/lib/meta/client";
import type {
  AnalyticsResponse,
  AdPerformanceRow,
  DailyMetrics,
  MetaInsightRow,
} from "@/types/analytics";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom =
      searchParams.get("dateFrom") ||
      new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const dateTo =
      searchParams.get("dateTo") || new Date().toISOString().split("T")[0];

    const supabase = createAdminClient();

    // Fetch user's Meta credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "meta_access_token, meta_token_expires_at, meta_ad_account_id"
      )
      .eq("id", DEV_USER_ID)
      .single();

    if (profileError || !profile?.meta_access_token) {
      return NextResponse.json(
        { error: "Meta account not connected." },
        { status: 400 }
      );
    }

    if (
      profile.meta_token_expires_at &&
      new Date(profile.meta_token_expires_at) < new Date()
    ) {
      return NextResponse.json({ needsReauth: true }, { status: 401 });
    }

    // Fetch all submissions with meta_ad_id
    const { data: submissions } = await supabase
      .from("submissions")
      .select("id, meta_ad_id, meta_status, format_name, created_at, templates(name)")
      .eq("user_id", DEV_USER_ID)
      .not("meta_ad_id", "is", null);

    if (!submissions || submissions.length === 0) {
      const empty: AnalyticsResponse = {
        summary: {
          totalSpend: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          avgCpm: 0,
          adsLive: 0,
          adsCreated: 0,
        },
        daily: [],
        ads: [],
      };
      return NextResponse.json(empty);
    }

    const ads: AdPerformanceRow[] = [];
    const dailyMap = new Map<string, DailyMetrics>();
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;
    let adsLive = 0;

    for (const sub of submissions) {
      try {
        // Summary insights
        const summaryRes = await fetchAdInsights(
          profile.meta_access_token,
          sub.meta_ad_id!,
          { since: dateFrom, until: dateTo }
        );

        const summaryData = (
          (summaryRes.data as MetaInsightRow[] | undefined) || []
        )[0];

        const impressions = Number(summaryData?.impressions || 0);
        const reach = Number(summaryData?.reach || 0);
        const clicks = Number(summaryData?.clicks || 0);
        const spend = Number(summaryData?.spend || 0);
        const cpm = Number(summaryData?.cpm || 0);

        totalImpressions += impressions;
        totalReach += reach;
        totalClicks += clicks;
        totalSpend += spend;

        if (sub.meta_status === "ACTIVE") adsLive++;

        const templateData = (sub.templates as unknown as { name: string } | null);

        ads.push({
          adId: sub.meta_ad_id!,
          adName: `${templateData?.name || "Ad"} - ${sub.format_name}`,
          status: sub.meta_status || "UNKNOWN",
          impressions,
          reach,
          clicks,
          spend,
          cpm,
          createdAt: sub.created_at,
        });

        // Daily breakdown
        const dailyRes = await fetchAdInsights(
          profile.meta_access_token,
          sub.meta_ad_id!,
          { since: dateFrom, until: dateTo, timeIncrement: "1" }
        );

        const dailyRows =
          (dailyRes.data as MetaInsightRow[] | undefined) || [];
        for (const row of dailyRows) {
          const date = row.date_start;
          const existing = dailyMap.get(date) || {
            date,
            spend: 0,
            impressions: 0,
            reach: 0,
            clicks: 0,
          };
          existing.spend += Number(row.spend || 0);
          existing.impressions += Number(row.impressions || 0);
          existing.reach += Number(row.reach || 0);
          existing.clicks += Number(row.clicks || 0);
          dailyMap.set(date, existing);
        }
      } catch (err) {
        const metaErr = err as Error & { code?: number };
        if (metaErr.code === 190 || metaErr.code === 10) {
          return NextResponse.json(
            { needsReauth: true, error: metaErr.message },
            { status: 401 }
          );
        }
        // Skip individual ad errors
        console.error(`Failed to fetch insights for ad ${sub.meta_ad_id}:`, err);
      }
    }

    const daily = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    const response: AnalyticsResponse = {
      summary: {
        totalSpend,
        totalImpressions,
        totalReach,
        totalClicks,
        avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        adsLive,
        adsCreated: submissions.length,
      },
      daily,
      ads: ads.sort((a, b) => b.impressions - a.impressions),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
