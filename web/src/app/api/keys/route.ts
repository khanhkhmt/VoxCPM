import { NextRequest, NextResponse } from "next/server";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generatePlainApiKey, hashApiKey, extractLastFour } from "@/lib/api-keys";

export async function GET(_req: NextRequest) {
    try {
        const user = await requireAuth();

        const keys = await prisma.apiKey.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
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
                expiresAt: true,
                revokedAt: true,
                lastUsedAt: true,
                createdAt: true,
                updatedAt: true,
                voiceProfileId: true,
                voiceProfile: {
                    select: {
                        id: true,
                        name: true,
                        fileName: true,
                        audioUrl: true,
                    }
                }
            }
        });

        return jsonOk({ keys });
    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const voiceProfileId = body.voiceProfileId;
        if (!voiceProfileId || typeof voiceProfileId !== "string") {
            return jsonError("BAD_REQUEST", "voiceProfileId is required", 400);
        }

        // Verify the voice profile belongs to the user
        const voiceProfile = await prisma.voiceProfile.findUnique({
            where: { id: voiceProfileId },
            select: { id: true, userId: true, name: true }
        });

        if (!voiceProfile) {
            return jsonError("NOT_FOUND", "Voice profile not found", 404);
        }

        if (voiceProfile.userId !== user.id) {
            return jsonError("FORBIDDEN", "You do not own this voice profile", 403);
        }

        // Check if voice already has an active API key
        const existingKey = await prisma.apiKey.findUnique({
            where: { voiceProfileId },
        });

        if (existingKey && existingKey.isActive) {
            return jsonError("CONFLICT", "This voice already has an active API key. Revoke it first or use Regenerate.", 409);
        }

        const name = body.name || `API Key for ${voiceProfile.name}`;
        const scopes = "tts.generate,tts.stream,usage.read";

        const plainKey = generatePlainApiKey();
        const keyHash = hashApiKey(plainKey);
        const lastFour = extractLastFour(plainKey);

        // If there was a revoked key, delete it first
        if (existingKey) {
            await prisma.apiKey.delete({ where: { id: existingKey.id } });
        }

        const newKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                voiceProfileId,
                name,
                prefix: "vc_sk_live",
                keyHash,
                lastFour,
                scopes,
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
        }, 201);
    } catch (error: unknown) {
        if (error instanceof NextResponse) return error;
        const message = error instanceof Error ? error.message : "Unknown error";
        return jsonError("INTERNAL_ERROR", message, 500);
    }
}
