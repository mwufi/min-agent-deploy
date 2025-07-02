import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import "../styles/landing.css";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export async function DebugPage() {
  const { userId, sessionId, getToken } = await auth();
  const user = await currentUser();

  return (
    <main className="bg-[#FAFAFA] relative">
      <div className="relative flex gap-3">
        <SignedIn>
          You are signed in. Your email is {user?.emailAddresses[0]?.emailAddress}
          <br />
          Your session ID is {sessionId}
          <br />
          Your user ID is {userId}
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-full bg-[#131316] text-white text-sm font-semibold"
          >
            Dashboard
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton>
            <button className="px-4 py-2 rounded-full bg-[#131316] text-white text-sm font-semibold">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </main>
  );
}
