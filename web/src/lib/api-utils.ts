import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

// ---------------------------------------------------------------------------
// Auth helper — returns current user or throws 401 response
// ---------------------------------------------------------------------------
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }
  return user;
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

// ---------------------------------------------------------------------------
// Admin helper — returns current user with admin role or throws 403 response
// ---------------------------------------------------------------------------
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 },
    );
  }
  return user;
}
