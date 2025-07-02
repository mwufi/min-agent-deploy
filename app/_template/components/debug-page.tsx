"use client";

import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import "../styles/landing.css";
import Link from "next/link";
import { useState } from "react";
import PipedreamConnect from "./pipedream-connect";

export function DebugPage() {
  const { user } = useUser();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = async (method: 'GET' | 'POST') => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      const response = await fetch('/api/protected', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Protected Endpoint Test</h2>
              <p className="text-gray-600 mb-4">Test the protected API endpoint with different HTTP methods:</p>

              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => makeRequest('GET')}
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'GET Request'}
                </button>

                <button
                  onClick={() => makeRequest('POST')}
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'POST Request'}
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">Error:</p>
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {apiResponse && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">Response:</p>
                  <pre className="text-green-600 text-sm mt-2 overflow-x-auto">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <PipedreamConnect />
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
