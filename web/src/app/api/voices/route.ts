import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import {
  encodeVoiceFromWav,
  downloadFeatureBytes,
} from "@/lib/voxcpm-client";

// ---------------------------------------------------------------------------
// GET /api/voices?page=1&limit=20 — List user's voice profiles
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.voiceProfile.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          fileName: true,
          audioUrl: true,
          fileSize: true,
          mimeType: true,
          description: true,
          featureUrl: true,
          voxcpmVersion: true,
          vaeVersion: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.voiceProfile.count({ where: { userId: user.id } }),
    ]);

    return jsonOk({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch voices", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/voices — Upload a new voice profile (with feature encoding + dedupe)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";
    const description = (formData.get("description") as string) || "";

    if (!file) {
      return jsonError("MISSING_FILE", "Audio file is required", 400);
    }

    if (!name.trim()) {
      return jsonError("MISSING_NAME", "Voice name is required", 400);
    }

    if (!file.type.startsWith("audio/")) {
      return jsonError("INVALID_TYPE", "File must be an audio file", 400);
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonError("FILE_TOO_LARGE", "File size must be under 10MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1) SHA-256 fingerprint
    const fingerprint = crypto.createHash("sha256").update(buffer).digest("hex");

    // 2) Deduplicate within user scope
    const existing = await prisma.voiceProfile.findUnique({
      where: { userId_fingerprint: { userId: user.id, fingerprint } },
    });
    if (existing) {
      return jsonOk({ ...existing, deduped: true }, 200);
    }

    // 3) Upload WAV to R2
    const ext = file.name.split(".").pop() || "wav";
    const r2Key = `voices/${user.id}/${Date.now()}.${ext}`;
    const { r2Url } = await uploadToR2(r2Key, buffer, file.type);

    // 4) Encode feature via FastAPI (synchronous, best-effort)
    let featureR2Key: string | null = null;
    let featureUrl: string | null = null;
    let featureSize: number | null = null;
    let voxcpmVersion: string | null = null;
    let vaeVersion: string | null = null;
    try {
      const enc = await encodeVoiceFromWav(buffer, file.name, file.type);
      const featBytes = await downloadFeatureBytes(enc.feature_url);
      const featKey = `voices/${user.id}/feat/${Date.now()}.safetensors`;
      const { r2Url: featR2Url } = await uploadToR2(
        featKey,
        featBytes,
        "application/octet-stream",
      );
      featureR2Key = featKey;
      featureUrl = featR2Url;
      featureSize = featBytes.byteLength;
      voxcpmVersion = enc.metadata.voxcpm_version || null;
      vaeVersion = enc.metadata.vae_version || null;
    } catch (e) {
      console.error("[voices] encode/upload feature failed (proceeding without cache):", e);
    }

    // 5) Save to database
    const voice = await prisma.voiceProfile.create({
      data: {
        userId: user.id,
        name: name.trim(),
        fileName: file.name,
        r2Key,
        audioUrl: r2Url,
        fileSize: file.size,
        mimeType: file.type,
        description: description.trim(),
        fingerprint,
        featureR2Key,
        featureUrl,
        featureSize,
        voxcpmVersion,
        vaeVersion,
        defaultMode: "reference",
        trimVad: false,
      },
    });

    return jsonOk(voice, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] POST error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to upload voice", 500);
  }
}
