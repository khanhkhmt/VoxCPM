import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";

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
// POST /api/voices — Upload a new voice profile
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

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      return jsonError("INVALID_TYPE", "File must be an audio file", 400);
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return jsonError("FILE_TOO_LARGE", "File size must be under 10MB", 400);
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const ext = file.name.split(".").pop() || "wav";
    const r2Key = `voices/${user.id}/${Date.now()}.${ext}`;
    const { r2Url } = await uploadToR2(r2Key, buffer, file.type);

    // Save to database
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
      },
    });

    return jsonOk(voice, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[voices] POST error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to upload voice", 500);
  }
}
