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
  blob: Blob;
  userId: string;
  templateId: string;
  templateSlug: string;
  templateName: string;
  formatName: string;
  selections: Record<string, string>;
  campaign?: CampaignData;
}

interface ExportResult {
  fileUrl: string;
  submissionId: string;
  metaAdId?: string;
  metaCampaignId?: string;
}

export async function exportToStorage({
  blob,
  userId,
  templateId,
  templateSlug,
  templateName,
  formatName,
  selections,
  campaign,
}: ExportToStorageOptions): Promise<ExportResult> {
  const supabase = createClient();
  const timestamp = Date.now();
  const path = `${userId}/${templateId}/${formatName}_${timestamp}.png`;

  // Upload to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("exports")
    .upload(path, blob, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("exports").getPublicUrl(uploadData.path);

  // Create submission record
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      format_name: formatName,
      file_url: publicUrl,
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
  const result: ExportResult = { fileUrl: publicUrl, submissionId: submission.id };

  // If publish to Meta is enabled, create the ad
  if (campaign?.publishToMeta) {
    const metaRes = await fetch("/api/meta/launch-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: submission.id,
        fileUrl: publicUrl,
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
