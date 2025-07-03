"use client";

import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import "../styles/landing.css";
import Link from "next/link";
import { ProtectedEndpointTest } from "./protected-endpoint-test";


export function DebugPage() {
  const { user } = useUser();

  return (
    <main className="bg-[#FAFAFA] min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex flex-col gap-6">
          <SignedIn>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">User Information</h2>
              <p>You are signed in. Your email is {user?.emailAddresses[0]?.emailAddress}</p>
              <p>Your user ID is {user?.id}</p>
              <Link
                href="/dashboard"
                className="inline-block mt-4 px-4 py-2 rounded-full bg-[#131316] text-white text-sm font-semibold"
              >
                Dashboard
              </Link>
            </div>

            <ProtectedEndpointTest />

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Link
                  href="/connect"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Connect Services</h3>
                    <p className="text-sm text-gray-500">Connect Gmail, Slack, and more</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">View Dashboard</h3>
                    <p className="text-sm text-gray-500">See your data and analytics</p>
                  </div>
                </Link>
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-lg font-semibold mb-4">Please Sign In</h2>
              <p className="text-gray-600 mb-4">You need to be signed in to test the protected endpoint.</p>
              <SignInButton>
                <button className="px-4 py-2 rounded-full bg-[#131316] text-white text-sm font-semibold">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </div>
    </main>
  );
}
