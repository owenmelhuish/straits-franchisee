export interface MetaInsightRow {
  date_start: string;
  date_stop: string;
  impressions: string;
  reach: string;
  clicks: string;
  spend: string;
  cpm: string;
}

export interface AdPerformanceRow {
  adId: string;
  adName: string;
  status: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  createdAt: string;
}

export interface DailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
}

export interface AnalyticsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  avgCpm: number;
  adsLive: number;
  adsCreated: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  daily: DailyMetrics[];
  ads: AdPerformanceRow[];
  needsReauth?: boolean;
}

export interface FranchiseeBreakdown {
  userId: string;
  name: string;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  adsCount: number;
  stale?: boolean;
}

export interface AdminAnalyticsResponse {
  summary: AnalyticsSummary;
  daily: DailyMetrics[];
  franchisees: FranchiseeBreakdown[];
  topAds: AdPerformanceRow[];
  staleFranchisees: string[];
}
