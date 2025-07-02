import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";

// This endpoint is used to search for apps in Pipedream
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q") || "";
        const cursor = searchParams.get("cursor");

        // Use the Pipedream SDK to search apps
        const response = await pd.getApps({
            q: query,
            ...(cursor && { cursor })
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error searching apps:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to search apps" },
            { status: 500 }
        );
    }
}