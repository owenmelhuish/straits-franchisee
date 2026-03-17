import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "Meta app not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "ads_management,pages_read_engagement,pages_show_list",
    response_type: "code",
  });

  const url = `https://www.facebook.com/v25.0/dialog/oauth?${params}`;
  return NextResponse.redirect(url);
}
