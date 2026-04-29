import { prisma } from "./db";

/**
 * Lazy reset: Nếu tháng hiện tại khác với tháng của lastQuotaReset,
 * reset usage về 0 và cập nhật lastQuotaReset.
 */
async function ensureMonthlyReset(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, lastQuotaReset: true }
    });

    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = user.lastQuotaReset;

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                usageCharsMonth: 0,
                lastQuotaReset: now
            }
        });
    }
}

/**
 * Kiểm tra và trừ Quota trong 1 bước (Deduct up-front).
 * Hỗ trợ cho cả Batch và Streaming V1 Endpoint.
 */
export async function checkAndDeductQuota(userId: string, charsToDeduct: number): Promise<boolean> {
    await ensureMonthlyReset(userId);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { quotaCharsMonth: true, usageCharsMonth: true }
    });

    if (!user) return false;

    if (user.usageCharsMonth + charsToDeduct > user.quotaCharsMonth) {
        return false; // Quota exceeded
    }

    // Trừ quota atomically
    await prisma.user.update({
        where: { id: userId },
        data: {
            usageCharsMonth: {
                increment: charsToDeduct
            }
        }
    });

    return true;
}

/**
 * Trả về thông tin Quota cho endpoint /api/v1/usage
 */
export async function getQuotaStatus(userId: string) {
    await ensureMonthlyReset(userId);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { quotaCharsMonth: true, usageCharsMonth: true, lastQuotaReset: true }
    });
    
    if (!user) return null;

    const remaining = user.quotaCharsMonth - user.usageCharsMonth;
    
    // Tính ngày reset (Ngày 1 của tháng tiếp theo)
    const resetDate = new Date(user.lastQuotaReset);
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    return {
        limit: user.quotaCharsMonth,
        used: user.usageCharsMonth,
        remaining: remaining > 0 ? remaining : 0,
        resetDate: resetDate.toISOString()
    };
}
