import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(600).optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

// PATCH /api/resources/[id] — admin toggles publish / featured / metadata
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
    const item = await db.resourceItem.update({ where: { id }, data: body });
    return NextResponse.json({ item });
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
