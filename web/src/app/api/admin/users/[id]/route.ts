import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Allowed values for safety
// ---------------------------------------------------------------------------
const VALID_ROLES = ["user", "admin"] as const;

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id — Update role or isActive
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id: targetId } = await params;

    // --- Safety: admin cannot modify their own account ---
    if (admin.id === targetId) {
      return jsonError(
        "SELF_MODIFY_DENIED",
        "You cannot modify your own account from the admin panel",
        403,
      );
    }

    // --- Validate target exists ---
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });

    if (!target) {
      return jsonError("NOT_FOUND", "User not found", 404);
    }

    // --- Parse body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const updateData: { role?: string; isActive?: boolean } = {};
    const payload = body as Record<string, unknown>;

    // --- Validate role ---
    if ("role" in payload) {
      const role = payload.role;
      if (typeof role !== "string" || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
        return jsonError("INVALID_ROLE", `Role must be one of: ${VALID_ROLES.join(", ")}`, 400);
      }
      updateData.role = role;
    }

    // --- Validate isActive ---
    if ("isActive" in payload) {
      if (typeof payload.isActive !== "boolean") {
        return jsonError("INVALID_VALUE", "isActive must be a boolean", 400);
      }
      updateData.isActive = payload.isActive;
    }

    // --- Nothing to update? ---
    if (Object.keys(updateData).length === 0) {
      return jsonError("NO_CHANGES", "No valid fields to update (allowed: role, isActive)", 400);
    }

    // --- Apply update ---
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return jsonOk(updated);
  } catch (error) {
    // Handle thrown NextResponse from requireAdmin/requireAuth
    if (error instanceof NextResponse) return error;
    if (error instanceof Response) return error;
    console.error("[admin/users] PATCH error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to update user", 500);
  }
}
