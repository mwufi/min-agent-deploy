import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const options = {
            app: searchParams.get("app") || undefined,
            oauth_app_id: searchParams.get("oauth_app_id") || undefined,
            external_user_id: searchParams.get("external_user_id") || undefined,
            include_credentials: searchParams.get("include_credentials") === "true",
        };

        const accounts = await pd.getAccounts({
            app: options?.app,
            oauth_app_id: options?.oauth_app_id,
            external_user_id: options?.external_user_id,
            include_credentials: options?.include_credentials,
        });
        return NextResponse.json(accounts);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list accounts" },
            { status: 500 }
        );
    }
}