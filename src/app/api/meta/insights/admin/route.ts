import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAdInsights } from "@/lib/meta/client";
import type {
  AdminAnalyticsResponse,
  AdPerformanceRow,
  DailyMetrics,
  FranchiseeBreakdown,
  MetaInsightRow,
} from "@/types/analytics";

export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const cookieStore = await cookies();
    const role = cookieStore.get("dev-role")?.value;
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom =
      searchParams.get("dateFrom") ||
      new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const dateTo =
      searchParams.get("dateTo") || new Date().toISOString().split("T")[0];
    const franchiseeFilter = searchParams.get("franchiseeId");

    const supabase = createAdminClient();

    // Fetch all profiles with Meta tokens
    let profileQuery = supabase
      .from("profiles")
      .select("id, full_name, meta_access_token, meta_token_expires_at, meta_ad_account_id")
      .not("meta_access_token", "is", null);

    if (franchiseeFilter) {
      profileQuery = profileQuery.eq("id", franchiseeFilter);
    }

    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) {
      const empty: AdminAnalyticsResponse = {
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
        franchisees: [],
        topAds: [],
        staleFranchisees: [],
      };
      return NextResponse.json(empty);
    }

    const allAds: AdPerformanceRow[] = [];
    const franchisees: FranchiseeBreakdown[] = [];
    const dailyMap = new Map<string, DailyMetrics>();
    const staleFranchisees: string[] = [];

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;
    let totalAdsLive = 0;
    let totalAdsCreated = 0;

    for (const profile of profiles) {
      // Check token expiry
      if (
        profile.meta_token_expires_at &&
        new Date(profile.meta_token_expires_at) < new Date()
      ) {
        staleFranchisees.push(profile.full_name || profile.id);
        continue;
      }

      // Fetch submissions for this franchisee
      const { data: submissions } = await supabase
        .from("submissions")
        .select("id, meta_ad_id, meta_status, format_name, created_at, templates(name)")
        .eq("user_id", profile.id)
        .not("meta_ad_id", "is", null);

      if (!submissions || submissions.length === 0) {
        franchisees.push({
          userId: profile.id,
          name: profile.full_name || "Unknown",
          totalSpend: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          adsCount: 0,
        });
        continue;
      }

      let fSpend = 0;
      let fImpressions = 0;
      let fReach = 0;
      let fClicks = 0;
      let fAdsLive = 0;

      for (const sub of submissions) {
        try {
          const summaryRes = await fetchAdInsights(
            profile.meta_access_token!,
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

          fImpressions += impressions;
          fReach += reach;
          fClicks += clicks;
          fSpend += spend;

          if (sub.meta_status === "ACTIVE") fAdsLive++;

          const templateData = (sub.templates as unknown as { name: string } | null);

          allAds.push({
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
            profile.meta_access_token!,
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
          if (metaErr.code === 190) {
            staleFranchisees.push(profile.full_name || profile.id);
            break;
          }
          console.error(`Failed to fetch insights for ad ${sub.meta_ad_id}:`, err);
        }
      }

      totalSpend += fSpend;
      totalImpressions += fImpressions;
      totalReach += fReach;
      totalClicks += fClicks;
      totalAdsLive += fAdsLive;
      totalAdsCreated += submissions.length;

      franchisees.push({
        userId: profile.id,
        name: profile.full_name || "Unknown",
        totalSpend: fSpend,
        totalImpressions: fImpressions,
        totalReach: fReach,
        totalClicks: fClicks,
        adsCount: submissions.length,
      });
    }

    const daily = Array.from(dailyMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    const response: AdminAnalyticsResponse = {
      summary: {
        totalSpend,
        totalImpressions,
        totalReach,
        totalClicks,
        avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        adsLive: totalAdsLive,
        adsCreated: totalAdsCreated,
      },
      daily,
      franchisees: franchisees.sort((a, b) => b.totalSpend - a.totalSpend),
      topAds: allAds.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
      staleFranchisees,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch admin analytics" },
      { status: 500 }
    );
  }
}
