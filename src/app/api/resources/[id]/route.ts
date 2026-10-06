import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest, toResourceItemView } from "@/lib/platform";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().max(600).optional(),
  hours: z.number().min(0).max(2000).optional(),
});

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(600).optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  /** Roadmap milestones — replaces the full ordered list when provided. */
  steps: z.array(stepSchema).max(30).optional(),
});

// PATCH /api/resources/[id] — admin toggles publish / featured / metadata,
// and edits roadmap steps (full ordered list replacement).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const { steps, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (steps) {
      data.steps = JSON.stringify(
        steps.map((s) => ({
          title: s.title,
          detail: s.detail ?? "",
          ...(s.hours !== undefined ? { hours: s.hours } : {}),
        }))
      );
    }
    const item = await db.resourceItem.update({
      where: { id },
      data,
      include: { category: true },
    });
    return NextResponse.json({ item: toResourceItemView(item, item.category) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update resource", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/resources/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.resourceItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to delete resource", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
