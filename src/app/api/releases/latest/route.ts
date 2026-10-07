import { NextResponse } from "next/server";
import { getAppRelease, isAppAvailable } from "@/config/app-release";

/**
 * GET /api/releases/latest
 * Public release metadata for the installable app. The client never reads app
 * env vars directly — this endpoint is the single source of truth, so the
 * artifact can be moved to a CDN later without frontend changes.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const release = getAppRelease();
    const { available, reason } = await isAppAvailable();
    return NextResponse.json(
      { release, available, reason },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[api/releases/latest] failed:", error);
    return NextResponse.json(
      { error: "Release information is temporarily unavailable." },
      { status: 500 }
    );
  }
}
