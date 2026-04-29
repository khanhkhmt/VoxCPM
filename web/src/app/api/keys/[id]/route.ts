import { NextRequest, NextResponse } from "next/server";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        
        const params = await Promise.resolve(context.params);
        const keyId = params.id;

        const apiKey = await prisma.apiKey.findUnique({
            where: { id: keyId }
        });

        if (!apiKey) {
            return jsonError("NOT_FOUND", "API Key not found", 404);
        }

        if (apiKey.userId !== user.id) {
            return jsonError("FORBIDDEN", "You do not have permission to delete this API Key", 403);
        }

        // Soft delete / Revoke
        const updatedKey = await prisma.apiKey.update({
            where: { id: keyId },
            data: {
                isActive: false,
                revokedAt: new Date()
            },
            select: {
                id: true,
                name: true,
                isActive: true,
                revokedAt: true
            }
        });

        return jsonOk({ key: updatedKey });
    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}
