import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/api-utils";

// ---------------------------------------------------------------------------
// GET /api/voices/:id/audio — Stream/redirect audio from R2
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
      select: { userId: true, audioUrl: true },
    });

    if (!voice) {
      return jsonError("NOT_FOUND", "Voice profile not found", 404);
    }

    if (voice.userId !== user.id) {
      return jsonError("FORBIDDEN", "You don't own this voice profile", 403);
    }

    // Redirect to R2 public URL for audio playback
    return NextResponse.redirect(voice.audioUrl);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] audio GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch audio", 500);
  }
}
