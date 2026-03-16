import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePsdToTemplateConfig } from "@/lib/psd/parser";
import { createTemplate } from "@/lib/supabase/db";
import { templateConfigToRow } from "@/types/database";
import { getDevUser } from "@/lib/dev-auth";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (devUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const slug = (formData.get("slug") as string) || `template-${Date.now()}`;
  const name = (formData.get("name") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "PSD file is required" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  try {
    // Ensure the "templates" bucket exists
    const { error: bucketError } = await supabase.storage.createBucket("templates", {
      public: true,
    });
    if (bucketError && !bucketError.message.includes("already exists")) {
      throw new Error(`Storage bucket error: ${bucketError.message}`);
    }

    const buffer = await file.arrayBuffer();

    // Upload function that writes to Supabase Storage
    const uploadFn = async (
      imgBuffer: Buffer,
      path: string,
      contentType: string
    ): Promise<string> => {
      const { data, error } = await supabase.storage
        .from("templates")
        .upload(path, imgBuffer, { contentType, upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("templates").getPublicUrl(data.path);
      return publicUrl;
    };

    const { config, warnings, stats } = await parsePsdToTemplateConfig(buffer, {
      uploadFn,
      slug,
      name: name || undefined,
    });

    // Save as draft template
    const row = templateConfigToRow(config, devUser.id, "draft");
    const template = await createTemplate(supabase, row);

    return NextResponse.json({ template, warnings, stats }, { status: 201 });
  } catch (error) {
    console.error("PSD parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse PSD" },
      { status: 500 }
    );
  }
}
