import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = "00000000-0000-0000-0000-000000000000"; // dev user
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("meta_access_token, meta_token_expires_at, meta_ad_account_id")
      .eq("id", userId)
      .single();

    const connected =
      !!profile?.meta_access_token &&
      (!profile.meta_token_expires_at ||
        new Date(profile.meta_token_expires_at) > new Date());

    return NextResponse.json({
      connected,
      adAccountId: connected ? profile.meta_ad_account_id : null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
