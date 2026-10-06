import { NextRequest, NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/categories — the category hub config with live, DB-derived counts
export async function GET(req: NextRequest) {
  try {
    const includeDisabled = req.nextUrl.searchParams.get("all") === "1";
    const categories = await getCategoriesWithCounts();
    return NextResponse.json({
      categories: includeDisabled ? categories : categories.filter((c) => c.enabled),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load categories", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
