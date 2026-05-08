import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonError } from "@/lib/api-utils";

// ---------------------------------------------------------------------------
// GET /api/voices/:id/audio — Proxy audio from R2 (avoids CORS issues)
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

    // Proxy the audio bytes instead of redirecting to avoid CORS issues
    const audioRes = await fetch(voice.audioUrl);
    if (!audioRes.ok) {
      return jsonError("UPSTREAM_ERROR", `Failed to fetch audio: ${audioRes.status}`, 502);
    }

    const contentType = audioRes.headers.get("content-type") || "audio/wav";
    const audioBody = audioRes.body;

    return new NextResponse(audioBody, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] audio GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch audio", 500);
  }
}
