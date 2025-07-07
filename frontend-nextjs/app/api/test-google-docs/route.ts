import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDocsClient } from '@/lib/server/google_docs_client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, documentId, requests, title } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = await getGoogleDocsClient(userId);

        switch (action) {
            case 'batchUpdate': {
                if (!documentId) {
                    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
                }
                
                const result = await client.batchUpdate({
                    documentId,
                    requestBody: { requests }
                });
                
                return NextResponse.json(result);
            }

            case 'get': {
                if (!documentId) {
                    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
                }
                
                const result = await client.get({ documentId });
                return NextResponse.json(result);
            }

            case 'create': {
                const result = await client.create(title || 'Test Document');
                return NextResponse.json(result);
            }

            case 'insertText': {
                if (!documentId) {
                    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
                }
                
                const { index, text } = body;
                const result = await client.insertText(documentId, index, text);
                return NextResponse.json(result);
            }

            case 'deleteRange': {
                if (!documentId) {
                    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
                }
                
                const { startIndex, endIndex } = body;
                const result = await client.deleteRange(documentId, startIndex, endIndex);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Google Docs API error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}