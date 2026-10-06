import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "delete"]),
});

// POST /api/resources/bulk — admin bulk actions across content rows.
// Immediately reflected in the hub via the live categories query.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bulkSchema.parse(await req.json());
    const { ids, action } = body;

    if (action === "delete") {
      const deleted = await db.resourceItem.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ affected: deleted.count, action });
    }

    const data =
      action === "publish"
        ? { published: true }
        : action === "unpublish"
          ? { published: false }
          : action === "feature"
            ? { featured: true }
            : { featured: false };

    const updated = await db.resourceItem.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return NextResponse.json({ affected: updated.count, action });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Bulk action failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
