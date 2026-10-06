import { NextRequest, NextResponse } from "next/server";
import { getLesson } from "@/lib/courses";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/courses/[slug]/lessons/[order] — the full lesson content
// (blocks, exercise with hints, quiz). Drafts visible to admins only.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; order: string }> }
) {
  const { slug, order } = await params;
  const n = Number(order);
  if (!Number.isInteger(n) || n < 1 || n > 200) {
    return NextResponse.json({ error: "Invalid lesson order" }, { status: 400 });
  }
  const includeDrafts =
    isAdminRequest(req) && req.nextUrl.searchParams.get("all") === "1";
  const lesson = await getLesson(slug, n, { includeDrafts });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  return NextResponse.json({ lesson });
}
