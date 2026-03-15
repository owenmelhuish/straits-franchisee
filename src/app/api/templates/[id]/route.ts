import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTemplateById, updateTemplate, deleteTemplate } from "@/lib/supabase/db";
import { getDevUser } from "@/lib/dev-auth";
import { validateBody, templateUpdateRules } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  try {
    const template = await getTemplateById(supabase, id);
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (devUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = validateBody(body, templateUpdateRules);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const template = await updateTemplate(supabase, id, body);
    return NextResponse.json(template);
  } catch {
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (devUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteTemplate(supabase, id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
