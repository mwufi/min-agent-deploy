import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";
import { getUserAccounts, syncUserAccounts } from "@/lib/server/accounts-service";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const options = {
            app: searchParams.get("app") || undefined,
            oauth_app_id: searchParams.get("oauth_app_id") || undefined,
            external_user_id: searchParams.get("external_user_id") || undefined,
            include_credentials: searchParams.get("include_credentials") === "true",
        };

        // Use database if only fetching by external_user_id
        let accounts;
        if (options.external_user_id && !options.app && !options.oauth_app_id && !options.include_credentials) {
            // Fetch from database
            const userAccounts = await getUserAccounts(options.external_user_id);
            accounts = { data: userAccounts };
        } else if (options.external_user_id) {
            // For filtered queries, fetch from DB and filter
            const userAccounts = await getUserAccounts(options.external_user_id);
            let filtered = userAccounts;
            
            if (options.app) {
                filtered = filtered.filter(acc => acc.app?.name_slug === options.app);
            }
            
            accounts = { data: filtered };
        } else {
            console.log("[debug] fetching from pipedream", JSON.stringify(options, null, 2));
            // For other queries, use direct API call
            accounts = await pd.getAccounts({
                app: options?.app,
                oauth_app_id: options?.oauth_app_id,
                external_user_id: options?.external_user_id,
                include_credentials: options?.include_credentials,
            });
        }

        return NextResponse.json(accounts);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list accounts" },
            { status: 500 }
        );
    }
}