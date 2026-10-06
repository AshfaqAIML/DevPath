import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(60).optional(),
  tagline: z.string().max(120).optional(),
  description: z.string().max(600).optional(),
  countLabel: z.string().min(1).max(40).optional(),
  icon: z.string().max(200).optional(),
  badge: z.string().max(20).nullable().optional(),
  badgeVariant: z.enum(["default", "secondary", "destructive", "outline"]).optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

// PATCH /api/categories/[id] — admin content management for category config
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
    const updated = await db.category.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ category: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update category", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
