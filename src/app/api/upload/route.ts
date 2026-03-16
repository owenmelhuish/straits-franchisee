import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDevUser } from "@/lib/dev-auth";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string) || "templates";
  const path = formData.get("path") as string;

  if (!file || !path) {
    return NextResponse.json(
      { error: "File and path are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, path: data.path });
}
