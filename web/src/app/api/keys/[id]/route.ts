import { NextRequest, NextResponse } from "next/server";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generatePlainApiKey, hashApiKey, extractLastFour } from "@/lib/api-keys";

// PATCH /api/keys/:id — Revoke an API key (soft delete)
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const keyId = params.id;

        const apiKey = await prisma.apiKey.findUnique({
            where: { id: keyId }
        });

        if (!apiKey) {
            return jsonError("NOT_FOUND", "API Key not found", 404);
        }

        if (apiKey.userId !== user.id) {
            return jsonError("FORBIDDEN", "You do not have permission to modify this API Key", 403);
        }

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
                revokedAt: true,
                voiceProfileId: true,
            }
        });

        return jsonOk({ key: updatedKey });
    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}

// PUT /api/keys/:id — Regenerate an API key (creates new key for same voice)
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const keyId = params.id;

        const apiKey = await prisma.apiKey.findUnique({
            where: { id: keyId },
            include: { voiceProfile: { select: { id: true, name: true, userId: true } } }
        });

        if (!apiKey) {
            return jsonError("NOT_FOUND", "API Key not found", 404);
        }

        if (apiKey.userId !== user.id) {
            return jsonError("FORBIDDEN", "You do not have permission to regenerate this API Key", 403);
        }

        // Delete old key
        await prisma.apiKey.delete({ where: { id: keyId } });

        // Generate new key for the same voice
        const plainKey = generatePlainApiKey();
        const keyHash = hashApiKey(plainKey);
        const lastFour = extractLastFour(plainKey);

        const newKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                voiceProfileId: apiKey.voiceProfileId,
                name: apiKey.name,
                prefix: "vc_sk_live",
                keyHash,
                lastFour,
                scopes: apiKey.scopes,
                environment: "live",
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                prefix: true,
                lastFour: true,
                scopes: true,
                environment: true,
                isActive: true,
                usageCount: true,
                rateLimit: true,
                createdAt: true,
                voiceProfileId: true,
                voiceProfile: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return jsonOk({
            key: newKey,
            plainKey
        });
    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}

// DELETE /api/keys/:id — Hard delete an API key
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
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

        await prisma.apiKey.delete({ where: { id: keyId } });

        return jsonOk({ deleted: true });
    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}
