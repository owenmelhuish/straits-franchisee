const META_API = "https://graph.facebook.com/v25.0";

// ── Helper: POST to Meta Graph API ──

async function metaPost(
  endpoint: string,
  accessToken: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams();
  body.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    body.set(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value)
    );
  }

  const res = await fetch(`${META_API}/${endpoint}`, {
    method: "POST",
    body,
  });

  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.error_user_msg || json.error.message || "Meta API error");
  }
  return json;
}

// ── Helper: GET from Meta Graph API ──

export async function metaGet(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(`${META_API}/${endpoint}?${query}`);
  const json = await res.json();
  if (json.error) {
    const err = json.error as { code?: number; error_user_msg?: string; message?: string };
    const error = new Error(err.error_user_msg || err.message || "Meta API error");
    (error as Error & { code?: number }).code = err.code;
    throw error;
  }
  return json;
}

// ── Insights Fetching ──

const INSIGHT_FIELDS = "impressions,reach,clicks,spend,cpm";

export async function fetchAdInsights(
  accessToken: string,
  adId: string,
  params: { since: string; until: string; timeIncrement?: string }
) {
  return metaGet(`${adId}/insights`, accessToken, {
    fields: INSIGHT_FIELDS,
    time_range: JSON.stringify({ since: params.since, until: params.until }),
    ...(params.timeIncrement ? { time_increment: params.timeIncrement } : {}),
  });
}

export async function fetchAccountInsights(
  accessToken: string,
  adAccountId: string,
  params: { since: string; until: string; timeIncrement?: string }
) {
  return metaGet(`${adAccountId}/insights`, accessToken, {
    fields: INSIGHT_FIELDS,
    time_range: JSON.stringify({ since: params.since, until: params.until }),
    ...(params.timeIncrement ? { time_increment: params.timeIncrement } : {}),
  });
}

// ── Token Exchange ──

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });

  const res = await fetch(`${META_API}/oauth/access_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Token exchange failed");
  }
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>;
}

export async function exchangeForLongLivedToken(shortToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });

  const res = await fetch(`${META_API}/oauth/access_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Long-lived token exchange failed");
  }
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>;
}

// ── Fetch Ad Accounts & Pages ──

export async function fetchAdAccounts(accessToken: string) {
  const res = await fetch(
    `${META_API}/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error("Failed to fetch ad accounts");
  const json = await res.json();
  return json.data as { id: string; name: string; account_status: number }[];
}

export async function fetchPages(accessToken: string) {
  const res = await fetch(
    `${META_API}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error("Failed to fetch pages");
  const json = await res.json();
  return json.data as { id: string; name: string; access_token: string }[];
}

// ── Ad Creation Pipeline ──

interface LaunchAdOptions {
  accessToken: string;
  adAccountId: string; // e.g. "act_123456"
  pageId: string;
  imageUrl: string;
  templateName: string;
  formatName: string;
  headline?: string;
  bodyText?: string;
  linkUrl?: string;
  callToAction?: string;
  budgetCents: number; // lifetime budget in cents
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  targetCountry?: string;
}

interface LaunchAdResult {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}

export async function launchAd(
  opts: LaunchAdOptions
): Promise<LaunchAdResult> {
  // 1. Create Campaign (PAUSED)
  const campaign = await metaPost(
    `${opts.adAccountId}/campaigns`,
    opts.accessToken,
    {
      name: `Creative Builder - ${opts.templateName}`,
      objective: "OUTCOME_AWARENESS",
      status: "PAUSED",
      special_ad_categories: [],
      is_campaign_budget_optimization: false,
      is_adset_budget_sharing_enabled: false,
    }
  );
  const campaignId = campaign.id as string;

  // 2. Create Ad Set (PAUSED)
  const adSet = await metaPost(
    `${opts.adAccountId}/adsets`,
    opts.accessToken,
    {
      name: `Ad Set - ${opts.formatName}`,
      campaign_id: campaignId,
      lifetime_budget: opts.budgetCents,
      start_time: opts.startTime,
      end_time: opts.endTime,
      optimization_goal: "REACH",
      billing_event: "IMPRESSIONS",
      bid_amount: 2,
      targeting: {
        geo_locations: {
          countries: [opts.targetCountry || "AU"],
        },
      },
      status: "PAUSED",
    }
  );
  const adSetId = adSet.id as string;

  // 3. Create Ad Creative (using picture URL — no image upload needed)
  const creative = await metaPost(
    `${opts.adAccountId}/adcreatives`,
    opts.accessToken,
    {
      name: `${opts.templateName} - ${opts.formatName} - ${new Date().toISOString().split("T")[0]}`,
      object_story_spec: {
        page_id: opts.pageId,
        link_data: {
          picture: opts.imageUrl,
          link: opts.linkUrl || "https://example.com",
          message: opts.bodyText || "",
          name: opts.headline || opts.templateName,
          call_to_action: {
            type: opts.callToAction || "LEARN_MORE",
          },
        },
      },
    }
  );
  const creativeId = creative.id as string;

  // 4. Create Ad (PAUSED)
  const ad = await metaPost(
    `${opts.adAccountId}/ads`,
    opts.accessToken,
    {
      name: `Ad - ${opts.templateName} - ${opts.formatName}`,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: "PAUSED",
    }
  );
  const adId = ad.id as string;

  return { campaignId, adSetId, creativeId, adId };
}
