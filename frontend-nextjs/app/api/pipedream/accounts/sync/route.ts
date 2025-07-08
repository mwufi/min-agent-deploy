import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncUserAccounts } from "@/lib/server/accounts-service";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accounts = await syncUserAccounts(userId);
        
        return NextResponse.json({ 
            success: true, 
            accountsCount: accounts.length,
            accounts: accounts 
        });
    } catch (error) {
        console.error("[Accounts Sync] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to sync accounts" },
            { status: 500 }
        );
    }
}