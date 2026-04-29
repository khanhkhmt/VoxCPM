import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import ApiDocsContent from "@/components/studio/ApiDocsContent";

export const metadata = {
    title: "API Documentation | VoxCPM Studio",
    description: "Developer documentation for VoxCPM TTS API v1.",
};

export default async function ApiDocsPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    return (
        <div className="max-w-5xl mx-auto py-8 px-6">
            <ApiDocsContent />
        </div>
    );
}
