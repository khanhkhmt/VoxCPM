import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { hashApiKey, hasScope } from "@/lib/api-keys";

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
  return user;
}

// ---------------------------------------------------------------------------
// External API helper — returns apiKey and user or throws response
// ---------------------------------------------------------------------------
export async function requireApiKey(req: NextRequest, requiredScope: string) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization Bearer token" } },
      { status: 401 },
    );
  }

  const plainKey = authHeader.substring("Bearer ".length).trim();
  const keyHash = hashApiKey(plainKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    throw NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid API Key" } },
      { status: 401 },
    );
  }

  if (!apiKey.isActive) {
    throw NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "API Key is inactive" } },
      { status: 403 },
    );
  }

  if (apiKey.revokedAt) {
    throw NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "API Key has been revoked" } },
      { status: 403 },
    );
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "API Key has expired" } },
      { status: 403 },
    );
  }

  if (!hasScope(apiKey.scopes, requiredScope)) {
    throw NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: `Missing required scope: ${requiredScope}` } },
      { status: 403 },
    );
  }

  // Update lastUsedAt asynchronously
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch((err) => console.error("Failed to update lastUsedAt:", err));

  return {
    apiKey,
    user: apiKey.user,
  };
}
