import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        console.log("=== Gmail Email Received Webhook ===");
        console.log("Timestamp:", new Date().toISOString());
        console.log("Payload:", JSON.stringify(payload, null, 2));
        console.log("=====================================");

        // You can add additional processing here, such as:
        // - Saving to database
        // - Triggering other workflows
        // - Sending notifications

        return NextResponse.json({
            success: true,
            message: "Email webhook received and logged",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error processing Gmail webhook:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to process webhook"
            },
            { status: 500 }
        );
    }
} 