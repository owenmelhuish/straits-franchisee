import { createClient } from "@/lib/supabase/client";

interface CampaignData {
  campaignStart: string;
  campaignEnd: string;
  budget: number;
}

interface ExportToStorageOptions {
  blob: Blob;
  userId: string;
  templateId: string;
  templateSlug: string;
  formatName: string;
  selections: Record<string, string>;
  campaign?: CampaignData;
}

export async function exportToStorage({
  blob,
  userId,
  templateId,
  templateSlug,
  formatName,
  selections,
  campaign,
}: ExportToStorageOptions): Promise<{ fileUrl: string; submissionId: string }> {
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
  return { fileUrl: publicUrl, submissionId: submission.id };
}
