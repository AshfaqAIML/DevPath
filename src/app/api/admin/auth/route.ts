import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_PASSWORD, isAdminRequest } from "@/lib/platform";

export const dynamic = "force-dynamic";

const authSchema = z.object({ password: z.string().min(1) });

// POST /api/admin/auth — gate for the admin console (demo-grade auth)
export async function POST(req: NextRequest) {
  try {
    const body = authSchema.parse(await req.json());
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, token: ADMIN_PASSWORD });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

// GET /api/admin/auth — check whether a key is already valid
export async function GET(req: NextRequest) {
  return NextResponse.json({ authorized: isAdminRequest(req) });
}
