'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function TestGoogleDocs() {
    const { user } = useUser();
    const userId = user?.id || '';
    const [documentId, setDocumentId] = useState('');
    const [textToInsert, setTextToInsert] = useState('👋 Hello from AI!');
    const [insertIndex, setInsertIndex] = useState(1);
    const [deleteStartIndex, setDeleteStartIndex] = useState(1);
    const [deleteEndIndex, setDeleteEndIndex] = useState(10);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const testBatchUpdate = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/test-google-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'batchUpdate',
                    userId,
                    documentId,
                    requests: [
                        { deleteContentRange: { range: { startIndex: deleteStartIndex, endIndex: deleteEndIndex } } },
                        { insertText: { location: { index: insertIndex }, text: textToInsert } }
                    ]
                })
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    const testGetDocument = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/test-google-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get',
                    userId,
                    documentId
                })
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    const testCreateDocument = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/test-google-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    userId,
                    title: 'Test Document from API'
                })
            });
            const data = await response.json();
            setResult(data);
            if (data.documentId) {
                setDocumentId(data.documentId);
            }
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Google Docs API Test Page</h1>
            
            <div className="space-y-6">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">User ID (from Clerk)</label>
                            <input
                                type="text"
                                value={userId}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 bg-gray-100 dark:bg-gray-900"
                                placeholder={!user ? "Loading..." : "No user ID"}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Document ID</label>
                            <input
                                type="text"
                                value={documentId}
                                onChange={(e) => setDocumentId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g., 1A2B3C4D5E6F..."
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Create New Document</h2>
                    <button
                        onClick={testCreateDocument}
                        disabled={!userId || loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                    >
                        Create Document
                    </button>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Batch Update (Delete + Insert)</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Delete Start Index</label>
                                <input
                                    type="number"
                                    value={deleteStartIndex}
                                    onChange={(e) => setDeleteStartIndex(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Delete End Index</label>
                                <input
                                    type="number"
                                    value={deleteEndIndex}
                                    onChange={(e) => setDeleteEndIndex(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Insert Index</label>
                            <input
                                type="number"
                                value={insertIndex}
                                onChange={(e) => setInsertIndex(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Text to Insert</label>
                            <input
                                type="text"
                                value={textToInsert}
                                onChange={(e) => setTextToInsert(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <button
                            onClick={testBatchUpdate}
                            disabled={!userId || !documentId || loading}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
                        >
                            Run Batch Update
                        </button>
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Get Document</h2>
                    <button
                        onClick={testGetDocument}
                        disabled={!userId || !documentId || loading}
                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
                    >
                        Get Document Content
                    </button>
                </div>

                {result && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Result</h2>
                        <pre className="whitespace-pre-wrap overflow-auto text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}