import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getItems, isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/resources?category=&q=&level=&sort=&all=1 — search / filter layer
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const includeDrafts = sp.get("all") === "1" && isAdminRequest(req);
    const items = await getItems({
      category: sp.get("category") ?? undefined,
      q: sp.get("q") ?? undefined,
      level: sp.get("level") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      includeDrafts,
      limit: sp.get("limit") ? Math.min(Number(sp.get("limit")) || 200, 200) : undefined,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load resources", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(600).default(""),
  categorySlug: z.string().min(1),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
  duration: z.string().max(30).optional(),
  tags: z.string().max(120).default(""),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

// POST /api/resources — admin creates new content (drives live counts)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = createSchema.parse(await req.json());
    const category = await db.category.findUnique({
      where: { slug: body.categorySlug },
    });
    if (!category) {
      return NextResponse.json({ error: "Unknown category" }, { status: 404 });
    }
    const baseSlug =
      body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "item";
    let slug = baseSlug;
    let n = 1;
    while (await db.resourceItem.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++n}`;
    }
    const item = await db.resourceItem.create({
      data: {
        slug,
        title: body.title,
        description: body.description,
        level: body.level,
        duration: body.duration ?? null,
        tags: body.tags,
        published: body.published,
        featured: body.featured,
        category: { connect: { id: category.id } },
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create resource", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
