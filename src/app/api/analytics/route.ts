import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  getAnalyticsSummary,
  isAdminRequest,
  logAnalyticsEvent,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  type: z.enum([
    "category_view",
    "card_click",
    "item_view",
    "search",
    "simulator_view",
    "challenge_complete",
    "lesson_view",
    "lesson_complete",
    "quiz_attempt",
    "assessment_pass",
  ]),
  slug: z.string().max(80).optional().nullable(),
  label: z.string().max(120).optional().nullable(),
});

// POST /api/analytics — first-party engagement tracking (rate limited)
export async function POST(req: NextRequest) {
  const clientKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!checkRateLimit(`analytics:${clientKey}`, 90, 60_000)) {
    return NextResponse.json(
      { error: "Too many events, slow down" },
      { status: 429 }
    );
  }
  try {
    const body = eventSchema.parse(await req.json());
    await logAnalyticsEvent(body.type, body.slug, body.label);
    // item views also increment the item's view counter
    if (body.type === "item_view" && body.slug) {
      await db.resourceItem
        .update({ where: { slug: body.slug }, data: { views: { increment: 1 } } })
        .catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Event failed" }, { status: 500 });
  }
}

// GET /api/analytics — summary for the admin console
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await getAnalyticsSummary();
  return NextResponse.json(summary);
}
