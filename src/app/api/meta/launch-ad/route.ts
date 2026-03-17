import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { launchAd } from "@/lib/meta/client";

interface LaunchAdBody {
  submissionId: string;
  fileUrl: string;
  templateName: string;
  formatName: string;
  headline?: string;
  bodyText?: string;
  linkUrl?: string;
  callToAction?: string;
  budgetCents: number;
  startTime: string;
  endTime: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LaunchAdBody;
    const {
      submissionId,
      fileUrl,
      templateName,
      formatName,
      headline,
      bodyText,
      linkUrl,
      callToAction,
      budgetCents,
      startTime,
      endTime,
    } = body;

    if (!submissionId || !fileUrl || !templateName || !formatName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = "00000000-0000-0000-0000-000000000000"; // dev user
    const supabase = createAdminClient();

    // Fetch user's Meta credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "meta_access_token, meta_token_expires_at, meta_ad_account_id, meta_page_id"
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile?.meta_access_token) {
      return NextResponse.json(
        { error: "Meta account not connected. Please connect in Settings." },
        { status: 400 }
      );
    }

    // Check token expiry
    if (
      profile.meta_token_expires_at &&
      new Date(profile.meta_token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "Meta token expired. Please reconnect in Settings." },
        { status: 401 }
      );
    }

    // Launch the ad
    const result = await launchAd({
      accessToken: profile.meta_access_token,
      adAccountId: profile.meta_ad_account_id,
      pageId: profile.meta_page_id,
      imageUrl: fileUrl,
      templateName,
      formatName,
      headline,
      bodyText,
      linkUrl,
      callToAction,
      budgetCents,
      startTime,
      endTime,
    });

    // Update submission with Meta ad info
    await supabase
      .from("submissions")
      .update({
        meta_ad_id: result.adId,
        meta_campaign_id: result.campaignId,
        meta_status: "PAUSED",
      })
      .eq("id", submissionId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Meta ad launch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create Meta ad" },
      { status: 500 }
    );
  }
}
