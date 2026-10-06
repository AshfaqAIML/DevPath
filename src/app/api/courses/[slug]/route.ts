import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCourse } from "@/lib/courses";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/courses/[slug] — course detail + curriculum (drafts included for
// admins, published lessons only for learners).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const includeDrafts =
    isAdminRequest(req) && req.nextUrl.searchParams.get("all") === "1";
  const course = await getCourse(slug, { includeDrafts });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json({ course });
}

const coursePatchSchema = z.object({
  subtitle: z.string().max(200).optional(),
  audience: z.string().max(1200).optional(),
  outcomes: z.array(z.string().min(1).max(300)).max(15).optional(),
  prereqSlugs: z.array(z.string().min(1).max(120)).max(10).optional(),
  technologies: z.array(z.string().min(1).max(60)).max(15).optional(),
  skills: z.array(z.string().min(1).max(60)).max(15).optional(),
  passScore: z.number().int().min(0).max(100).optional(),
  version: z.string().max(20).optional(),
  contentStatus: z.enum(["draft", "review", "published", "archived"]).optional(),
});

// PATCH /api/courses/[slug] — admin edits course metadata (content
// administration without touching frontend source code).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slug } = await params;
    const body = coursePatchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) data[key] = JSON.stringify(value);
      else data[key] = value;
    }
    await db.course.update({ where: { courseSlug: slug }, data });
    const course = await getCourse(slug, { includeDrafts: true });
    return NextResponse.json({ course });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update course", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/courses/[slug] — admin creates the Course record for an existing
// catalog item (seeds it with defaults, content arrives via lesson CRUD).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { slug } = await params;
    const item = await db.resourceItem.findUnique({ where: { slug } });
    if (!item) {
      return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
    }
    await db.course.upsert({
      where: { courseSlug: slug },
      create: { courseSlug: slug },
      update: {},
    });
    const course = await getCourse(slug, { includeDrafts: true });
    return NextResponse.json({ course });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create course", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
