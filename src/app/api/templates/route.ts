import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplates, createTemplate } from "@/lib/supabase/db";
import { getDevUser } from "@/lib/dev-auth";
import { validateBody, templateCreateRules } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const status = request.nextUrl.searchParams.get("status") as
    | "draft"
    | "active"
    | "archived"
    | null;

  try {
    const { data: templates, count } = await getTemplates(supabase, status ?? undefined);
    return NextResponse.json({ data: templates, count });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (devUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = validateBody(body, templateCreateRules);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const template = await createTemplate(adminClient, {
      ...body,
      created_by: devUser?.id ?? null,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/templates error:", error);

    // Supabase errors include a `code` property
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "A template with this slug already exists. Choose a different slug." },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
