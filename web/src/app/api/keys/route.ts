import { NextRequest, NextResponse } from "next/server";
import { requireAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generatePlainApiKey, hashApiKey, extractLastFour, ApiKeyEnvironment } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
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
                expiresAt: true,
                revokedAt: true,
                lastUsedAt: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return jsonOk({ keys });
    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const name = body.name || "My API Key";
        const env: ApiKeyEnvironment = body.environment === "test" ? "test" : "live";
        // Default to all scopes for MVP
        const scopes = "tts.generate,tts.stream,usage.read";

        const plainKey = generatePlainApiKey(env);
        const keyHash = hashApiKey(plainKey);
        const lastFour = extractLastFour(plainKey);

        const newKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                name,
                prefix: `vox_sk_${env}`,
                keyHash,
                lastFour,
                scopes,
                environment: env,
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
                createdAt: true,
            }
        });

        // Return plain key exactly once, NO keyHash exposed
        return jsonOk({
            key: newKey,
            plainKey
        }, 201);
    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}
