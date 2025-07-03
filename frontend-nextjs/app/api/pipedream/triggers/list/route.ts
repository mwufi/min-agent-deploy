import { NextRequest, NextResponse } from "next/server";
import { getTriggers } from "@/lib/pipedream/triggers/utils";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const externalUserId = searchParams.get("external_user_id");

        if (!externalUserId) {
            return NextResponse.json(
                { error: "external_user_id parameter is required" },
                { status: 400 }
            );
        }

        const triggers = await getTriggers(externalUserId);

        return NextResponse.json({
            data: triggers,
            success: true
        });

    } catch (error) {
        console.error("Error fetching triggers:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch triggers",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
