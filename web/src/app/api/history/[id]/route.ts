import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";

// ---------------------------------------------------------------------------
// DELETE /api/history/:id — Delete a single history item
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Find the generation and verify ownership
    const generation = await prisma.tTSGeneration.findUnique({
      where: { id },
      select: { userId: true, audioR2Key: true },
    });

    if (!generation) {
      return jsonError("NOT_FOUND", "Generation not found", 404);
    }

    if (generation.userId !== user.id) {
      return jsonError("FORBIDDEN", "You don't own this generation", 403);
    }

    // Delete R2 file
    try {
      await deleteFromR2(generation.audioR2Key);
    } catch (err) {
      console.error("[history] R2 delete error:", err);
      // Continue with DB delete even if R2 fails
    }

    // Delete DB record
    await prisma.tTSGeneration.delete({ where: { id } });

    return jsonOk({ deleted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[history] DELETE single error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to delete generation", 500);
  }
}
