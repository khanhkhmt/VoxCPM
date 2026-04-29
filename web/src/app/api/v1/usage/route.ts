import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, jsonOk, jsonError } from "@/lib/api-utils";
import { getQuotaStatus } from "@/lib/quota";

export async function GET(req: NextRequest) {
    try {
        const { user, apiKey } = await requireApiKey(req, "usage.read");

        const status = await getQuotaStatus(user.id);
        if (!status) {
            return jsonError("NOT_FOUND", "User quota not found", 404);
        }

        return jsonOk({
            environment: apiKey.environment,
            limit: status.limit,
            used: status.used,
            remaining: status.remaining,
            reset_date: status.resetDate
        });
    } catch (error: any) {
        if (error instanceof NextResponse) return error;
        console.error("V1 Usage API Error:", error);
        return jsonError("INTERNAL_ERROR", error.message, 500);
    }
}
