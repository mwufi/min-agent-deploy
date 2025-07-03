import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ componentKey: string }> }
) {
    try {
        const { componentKey } = await params;

        // Fetch the component definition from Pipedream
        const component = await pd.getComponent({ key: componentKey });

        return NextResponse.json(component);
    } catch (error) {
        console.error("Error fetching component definition:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch component definition" },
            { status: 500 }
        );
    }
} 