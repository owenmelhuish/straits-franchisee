import { createClient } from "@/lib/supabase/client";

interface CampaignData {
  campaignStart: string;
  campaignEnd: string;
  budget: number;
  publishToMeta?: boolean;
  headline: string;
  caption: string;
  linkUrl: string;
  callToAction: string;
}

interface ExportToStorageOptions {
  // One PNG per slide. Single-slide templates pass a 1-element array.
  blobs: Blob[];
  userId: string;
  templateId: string;
  templateSlug: string;
  templateName: string;
  formatName: string;
  selections: Record<string, string>;
  campaign?: CampaignData;
}

interface ExportResult {
  fileUrl: string; // cover / first slide — kept for backward-compat readers
  slideFileUrls: string[]; // all slide URLs in order
  submissionId: string;
  metaAdId?: string;
  metaCampaignId?: string;
}

export async function exportToStorage({
  blobs,
  userId,
  templateId,
  templateName,
  formatName,
  selections,
  campaign,
}: ExportToStorageOptions): Promise<ExportResult> {
  if (blobs.length === 0) throw new Error("No slides to export");
  const supabase = createClient();
  const timestamp = Date.now();

  // Upload all slides in parallel
  const uploads = await Promise.all(
    blobs.map(async (blob, i) => {
      const suffix = blobs.length > 1 ? `_slide${i + 1}` : "";
      const path = `${userId}/${templateId}/${formatName}${suffix}_${timestamp}.png`;
      const { data, error } = await supabase.storage
        .from("exports")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (error) throw error;
      return data.path;
    })
  );

  const slideFileUrls = uploads.map(
    (path) => supabase.storage.from("exports").getPublicUrl(path).data.publicUrl
  );
  const coverUrl = slideFileUrls[0];

  // Create submission record. `file_url` remains the cover for back-compat.
  // `slide_file_urls` is the full list; null-equivalent for legacy readers.
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      format_name: formatName,
      file_url: coverUrl,
      slide_file_urls: blobs.length > 1 ? slideFileUrls : null,
      selections,
      campaign_start: campaign?.campaignStart ?? null,
      campaign_end: campaign?.campaignEnd ?? null,
      budget: campaign?.budget ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create submission");
  }

  const submission = await res.json();
  const result: ExportResult = {
    fileUrl: coverUrl,
    slideFileUrls,
    submissionId: submission.id,
  };

  // If publish to Meta is enabled, create the ad. Carousels (>1 slide) vs single-image
  // is detected server-side from fileUrls.length.
  if (campaign?.publishToMeta) {
    const metaRes = await fetch("/api/meta/launch-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: submission.id,
        fileUrls: slideFileUrls,
        templateName,
        formatName,
        headline: campaign.headline,
        bodyText: campaign.caption,
        linkUrl: campaign.linkUrl,
        callToAction: campaign.callToAction,
        budgetCents: (campaign.budget ?? 0) * 100,
        startTime: `${campaign.campaignStart}T00:00:00+0000`,
        endTime: `${campaign.campaignEnd}T00:00:00+0000`,
      }),
    });

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      result.metaAdId = metaData.adId;
      result.metaCampaignId = metaData.campaignId;
    } else {
      const metaErr = await metaRes.json();
      throw new Error(metaErr.error || "Failed to publish to Meta");
    }
  }

  return result;
}
