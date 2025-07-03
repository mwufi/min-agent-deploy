import { NextRequest, NextResponse } from "next/server";
import pd from "@/lib/server/pipedream_client";

export async function POST(request: NextRequest) {
    try {
        const { externalUserId, gmailAccountId, triggerType = "gmail-new-email-received" } = await request.json();

        if (!externalUserId) {
            return NextResponse.json(
                { error: "Missing required field: externalUserId" },
                { status: 400 }
            );
        }

        // Get user's accounts to find Gmail accounts
        const accountsResponse = await pd.getAccounts({
            external_user_id: externalUserId,
        });

        const gmailAccounts = accountsResponse.data?.filter((account: any) =>
            account.app.name_slug === "gmail"
        ) || [];

        if (gmailAccounts.length === 0) {
            return NextResponse.json(
                { error: "No Gmail accounts found for this user. Please connect a Gmail account first." },
                { status: 400 }
            );
        }

        // Use specified account or default to first Gmail account
        let targetAccount;
        if (gmailAccountId) {
            targetAccount = gmailAccounts.find((account: any) => account.id === gmailAccountId);
            if (!targetAccount) {
                return NextResponse.json(
                    { error: "Specified Gmail account not found" },
                    { status: 400 }
                );
            }
        } else {
            targetAccount = gmailAccounts[0]; // Use first Gmail account
            console.log("Using Gmail account:", targetAccount);
        }

        // Use environment variable for webhook URL
        const webhookUrl = `${process.env.BACKEND_GMAIL_EMAIL_RECEIVED_WEBHOOK}`;

        // Configure props based on trigger type
        let configuredProps;
        switch (triggerType) {
            case "gmail-new-email-received":
                configuredProps = {
                    gmail: {
                        authProvisionId: targetAccount.id
                    }
                };
                break;
            default:
                return NextResponse.json(
                    { error: `Unsupported trigger type: ${triggerType}` },
                    { status: 400 }
                );
        }

        console.log("Deploying trigger:", {
            externalUserId,
            triggerId: triggerType,
            webhookUrl,
            configuredProps,
            accountName: targetAccount.name
        });

        // Deploy the trigger using Pipedream SDK
        const response = await pd.deployTrigger({
            externalUserId: externalUserId,
            triggerId: triggerType,
            webhookUrl: webhookUrl,
            configuredProps: configuredProps
        });

        console.log("Trigger deployed successfully:", response);

        return NextResponse.json({
            success: true,
            data: {
                ...response,
                accountId: targetAccount.id,
                accountName: targetAccount.name,
                webhookUrl: webhookUrl
            },
            message: `Gmail trigger deployed successfully for ${targetAccount.name}`
        });
    } catch (error) {
        console.error("Error deploying trigger:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to deploy trigger"
            },
            { status: 500 }
        );
    }
} 