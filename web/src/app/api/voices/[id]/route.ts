import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";

// ---------------------------------------------------------------------------
// GET /api/voices/:id — Get voice profile details
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const voice = await prisma.voiceProfile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileName: true,
        audioUrl: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    if (!voice) {
      return jsonError("NOT_FOUND", "Voice profile not found", 404);
    }

    if (voice.userId !== user.id) {
      return jsonError("FORBIDDEN", "You don't own this voice profile", 403);
    }

    return jsonOk(voice);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] GET single error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch voice", 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/voices/:id — Update name/description
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const voice = await prisma.voiceProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!voice) {
      return jsonError("NOT_FOUND", "Voice profile not found", 404);
    }

    if (voice.userId !== user.id) {
      return jsonError("FORBIDDEN", "You don't own this voice profile", 403);
    }

    const body = await request.json();
    const updateData: { name?: string; description?: string } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return jsonError("NO_CHANGES", "No valid fields to update", 400);
    }

    const updated = await prisma.voiceProfile.update({
      where: { id },
      data: updateData,
    });

    return jsonOk(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] PATCH error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to update voice", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/voices/:id — Delete voice profile + R2 file
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const voice = await prisma.voiceProfile.findUnique({
      where: { id },
      select: { userId: true, r2Key: true },
    });

    if (!voice) {
      return jsonError("NOT_FOUND", "Voice profile not found", 404);
    }

    if (voice.userId !== user.id) {
      return jsonError("FORBIDDEN", "You don't own this voice profile", 403);
    }

    // Delete R2 file
    try {
      await deleteFromR2(voice.r2Key);
    } catch (err) {
      console.error("[voices] R2 delete error:", err);
    }

    // Delete DB record
    await prisma.voiceProfile.delete({ where: { id } });

    return jsonOk({ deleted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] DELETE error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to delete voice", 500);
  }
}
