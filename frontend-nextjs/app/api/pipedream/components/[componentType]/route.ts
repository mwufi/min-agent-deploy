import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";
import { ComponentType } from "@pipedream/sdk";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ componentType: string }> }
) {
    try {
        const { componentType } = await params;
        const searchParams = request.nextUrl.searchParams;
        const options = {
            app: searchParams.get("app") || undefined,
            q: searchParams.get("q") || undefined,
        };

        const components = await pd.getComponents({
            app: options?.app,
            q: options?.q,
            componentType: componentType as ComponentType || "actions" as ComponentType,
        });
        return NextResponse.json(components);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list components" },
            { status: 500 }
        );
    }
}