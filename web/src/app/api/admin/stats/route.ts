import { requireAdmin, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/admin/stats — Dashboard statistics
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    await requireAdmin();

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalGenerations,
      totalVoiceProfiles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.tTSGeneration.count(),
      prisma.voiceProfile.count(),
    ]);

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Recent generations (last 7 days)
    const recentGenerations = await prisma.tTSGeneration.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return jsonOk({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      totalGenerations,
      totalVoiceProfiles,
      recentUsers,
      recentGenerations,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[admin/stats] GET error:", error);
    return jsonError("INTERNAL_ERROR", "Failed to fetch stats", 500);
  }
}
