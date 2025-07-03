import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, sessionId } = await auth();

  return NextResponse.json({
    message: "This is a protected route",
    timestamp: new Date().toISOString(),
    userId,
    sessionId,
  });
}

export async function POST() {
  await auth.protect();

  return NextResponse.json({
    message: "Protected POST endpoint accessed successfully",
    timestamp: new Date().toISOString(),
  });
}
