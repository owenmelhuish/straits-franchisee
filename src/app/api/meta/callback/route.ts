import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchAdAccounts,
  fetchPages,
} from "@/lib/meta/client";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    const errorDesc = request.nextUrl.searchParams.get("error_description");
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?meta_error=${encodeURIComponent(errorDesc || "Authorization denied")}`,
        request.url
      )
    );
  }

  try {
    // Exchange code for short-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code);

    // Exchange for long-lived token (60 days)
    const { access_token: longToken, expires_in } =
      await exchangeForLongLivedToken(shortToken);

    const expiresAt = new Date(
      Date.now() + expires_in * 1000
    ).toISOString();

    // Fetch ad accounts and pages
    const adAccounts = await fetchAdAccounts(longToken);
    const pages = await fetchPages(longToken);

    // Use first active ad account and first page as defaults
    const activeAccount = adAccounts.find((a) => a.account_status === 1);
    const firstPage = pages[0];

    if (!activeAccount) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?meta_error=No active ad account found",
          request.url
        )
      );
    }

    // Get dev user ID from cookie
    const cookieStore = await cookies();
    const devRole = cookieStore.get("dev-role")?.value;
    if (!devRole) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    const userId = "00000000-0000-0000-0000-000000000000"; // dev user

    // Store token in profiles table
    const supabase = createAdminClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        meta_access_token: longToken,
        meta_token_expires_at: expiresAt,
        meta_ad_account_id: activeAccount.id,
        meta_page_id: firstPage?.id ?? null,
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Failed to store Meta token:", dbError);
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?meta_error=Failed to save credentials",
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard/settings?meta_connected=true", request.url)
    );
  } catch (err) {
    console.error("Meta OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?meta_error=${encodeURIComponent(String(err))}`,
        request.url
      )
    );
  }
}
