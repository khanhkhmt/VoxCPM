import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";

// ---------------------------------------------------------------------------
// GET /api/history?page=1&limit=20 — List user's TTS generations
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.tTSGeneration.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          text: true,
          controlInstruction: true,
          audioUrl: true,
          language: true,
          cfgValue: true,
          ditSteps: true,
          doNormalize: true,
          denoise: true,
          usePromptText: true,
          promptText: true,
          voiceProfileId: true,
          createdAt: true,
        },
      }),
      prisma.tTSGeneration.count({ where: { userId: user.id } }),
    ]);

    return jsonOk({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    // If it's a NextResponse (from requireAuth), return it directly
    if (error instanceof Response) return error;
    console.error("[history] GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch history", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/history — Save a new TTS generation
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const {
      text,
      controlInstruction = "",
      audioUrl,
      language = "auto",
      cfgValue = 2.0,
      ditSteps = 6,
      doNormalize = false,
      denoise = false,
      usePromptText = false,
      promptText = "",
    } = body;

    if (!text || !audioUrl) {
      return jsonError("INVALID_INPUT", "text and audioUrl are required", 400);
    }

    // --- Download audio from FastAPI local URL ---
    let audioBuffer: Buffer;
    let contentType = "audio/wav";
    try {
      // audioUrl looks like: http://127.0.0.1:8808/api/tts/file/xxx.wav
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        return jsonError("AUDIO_FETCH_FAILED", `Failed to fetch audio: ${audioRes.status}`, 500);
      }
      contentType = audioRes.headers.get("content-type") || "audio/wav";
      const arrayBuffer = await audioRes.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error("[history] Audio fetch error:", err);
      return jsonError("AUDIO_FETCH_FAILED", "Could not download audio from TTS backend", 500);
    }

    // --- Upload to R2 ---
    const ext = contentType.includes("mp3") ? "mp3" : "wav";
    const r2Key = `generations/${user.id}/${Date.now()}.${ext}`;
    const { r2Url } = await uploadToR2(r2Key, audioBuffer, contentType);

    // --- Save to database ---
    const generation = await prisma.tTSGeneration.create({
      data: {
        userId: user.id,
        text,
        controlInstruction,
        audioUrl: r2Url,
        audioR2Key: r2Key,
        language,
        cfgValue,
        ditSteps,
        doNormalize,
        denoise,
        usePromptText,
        promptText,
      },
    });

    // --- (Optional) Delete local file on FastAPI ---
    try {
      const fileName = audioUrl.split("/").pop();
      if (fileName) {
        fetch(`http://127.0.0.1:8808/api/tts/file/${fileName}`, { method: "DELETE" }).catch(() => {});
      }
    } catch {
      // Silent fail — not critical
    }

    return jsonOk({ id: generation.id, audioUrl: r2Url }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[history] POST error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to save generation", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/history — Clear all user's history
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const user = await requireAuth();

    // Get all generations to delete R2 files
    const generations = await prisma.tTSGeneration.findMany({
      where: { userId: user.id },
      select: { audioR2Key: true },
    });

    // Delete R2 files (fire-and-forget for speed)
    await Promise.allSettled(
      generations.map((g: { audioR2Key: string }) => deleteFromR2(g.audioR2Key)),
    );

    // Delete all DB records
    await prisma.tTSGeneration.deleteMany({
      where: { userId: user.id },
    });

    return jsonOk({ deleted: generations.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[history] DELETE error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to clear history", 500);
  }
}
