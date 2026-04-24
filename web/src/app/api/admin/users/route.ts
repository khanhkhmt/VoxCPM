import { NextRequest } from "next/server";
import { requireAdmin, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Shared select — never expose passwordHash
// ---------------------------------------------------------------------------
const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      generations: true,
      voiceProfiles: true,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// GET /api/admin/users?page=1&pageSize=20&q=search
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const q = searchParams.get("q")?.trim() || "";
    const skip = (page - 1) * pageSize;

    // Build where clause for search
    const where = q
      ? {
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
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
    console.error("[admin/users] GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch users", 500);
  }
}
