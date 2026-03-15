import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTemplates, createTemplate } from "@/lib/supabase/db";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const status = request.nextUrl.searchParams.get("status") as
    | "draft"
    | "active"
    | "archived"
    | null;

  try {
    const templates = await getTemplates(supabase, status ?? undefined);
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const template = await createTemplate(supabase, {
      ...body,
      created_by: user.id,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
