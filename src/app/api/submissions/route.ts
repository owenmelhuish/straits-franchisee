import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubmissions, createSubmission } from "@/lib/supabase/db";
import { getDevUser } from "@/lib/dev-auth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templateId = request.nextUrl.searchParams.get("templateId") ?? undefined;

  try {
    // Admin sees all submissions, franchisee sees only their own
    const filters =
      devUser.role === "admin"
        ? { templateId }
        : { userId: devUser.id, templateId };

    const submissions = await getSubmissions(supabase, filters);
    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const devUser = await getDevUser();

  if (!devUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const submission = await createSubmission(supabase, {
      ...body,
      user_id: devUser.id,
    });
    return NextResponse.json(submission, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
