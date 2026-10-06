import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  createAdminSessionToken,
  isAdminRequest,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const authSchema = z.object({ password: z.string().min(1) });

// POST /api/admin/auth — gate for the admin console.
// On success issues an httpOnly, signed, expiring session cookie. The raw
// credential is never returned to (or stored by) the client; the header-based
// `x-admin-key` path remains available for programmatic API access.
export async function POST(req: NextRequest) {
  try {
    const body = authSchema.parse(await req.json());
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const { token, maxAge } = createAdminSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

// GET /api/admin/auth — check whether the request carries a valid session
// (cookie or key). Used by the console to restore state across reloads.
export async function GET(req: NextRequest) {
  return NextResponse.json({ authorized: isAdminRequest(req) });
}

// DELETE /api/admin/auth — log out: clears the session cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
