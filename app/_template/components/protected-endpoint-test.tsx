"use client";

import { useState } from "react";

export function ProtectedEndpointTest() {
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
    );
} 