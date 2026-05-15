import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import PlaygroundPanel from "@/components/studio/PlaygroundPanel";

export const metadata = {
    title: "Playground | VoxCPM Studio",
    description: "Test your voice API keys live with the interactive playground.",
};

export default async function PlaygroundPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <PlaygroundPanel />
        </div>
    );
}
