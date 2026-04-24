import { NextRequest } from "next/server";
import { requireAdmin, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/admin/history?page=1&pageSize=20&userId=xxx&q=search
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const userId = searchParams.get("userId")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (q) {
      where.OR = [
        { text: { contains: q } },
        { controlInstruction: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tTSGeneration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
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
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      }),
      prisma.tTSGeneration.count({ where }),
    ]);

    return jsonOk({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[admin/history] GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch history", 500);
  }
}
