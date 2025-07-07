import pd from './pipedream_client';

export async function getGoogleDocsAccounts(userId: string) {
    const accounts = await pd.getAccounts({
        external_user_id: userId,
    });
    
    return accounts.data?.filter((account: any) => 
        account.app?.name?.toLowerCase() === "google docs"
    ) || [];
}

async function makeGoogleDocsRequest(
    userId: string,
    endpoint: string,
    options: RequestInit = {},
    accountId?: string
) {
    const accounts = await getGoogleDocsAccounts(userId);
    
    if (!accounts || accounts.length === 0) {
        throw new Error("No Google Docs accounts found for user");
    }
    
    const targetAccountId = accountId || accounts[0].id;
    
    if (accountId && !accounts.find((acc: any) => acc.id === accountId)) {
        throw new Error(`Google Docs account ${accountId} not found for user`);
    }
    
    const response = await pd.makeProxyRequest(
        {
            searchParams: {
                account_id: targetAccountId,
                external_user_id: userId,
            }
        },
        {
            url: `https://docs.googleapis.com/v1/documents/${endpoint}`,
            options: {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            }
        }
    );
    
    if (typeof response === 'string') {
        return JSON.parse(response);
    }
    return response;
}

export interface BatchUpdateRequest {
    documentId: string;
    requestBody: {
        requests: Array<
            | { insertText: { location: { index: number }; text: string } }
            | { deleteContentRange: { range: { startIndex: number; endIndex: number } } }
            | { updateTextStyle?: any }
            | { createParagraphBullets?: any }
            | { deleteParagraphBullets?: any }
            | { createNamedRange?: any }
            | { deleteNamedRange?: any }
            | { updateDocumentStyle?: any }
            | { insertInlineImage?: any }
            | { insertPageBreak?: any }
            | { insertTable?: any }
            | { insertTableRow?: any }
            | { insertTableColumn?: any }
            | { deleteTableRow?: any }
            | { deleteTableColumn?: any }
            | { replaceAllText?: any }
            | { deletePositionedObject?: any }
        >;
        writeControl?: {
            requiredRevisionId?: string;
            targetRevisionId?: string;
        };
    };
}

export interface GetDocumentRequest {
    documentId: string;
    suggestionsViewMode?: 'SUGGESTIONS_INLINE' | 'PREVIEW_SUGGESTIONS_ACCEPTED' | 'PREVIEW_WITHOUT_SUGGESTIONS';
}

export class GoogleDocsClient {
    constructor(
        private userId: string,
        private accountId?: string
    ) {}
    
    async batchUpdate(request: BatchUpdateRequest) {
        const { documentId, requestBody } = request;
        
        return await makeGoogleDocsRequest(
            this.userId,
            `${documentId}:batchUpdate`,
            {
                method: 'POST',
                body: JSON.stringify(requestBody)
            },
            this.accountId
        );
    }
    
    async get(request: GetDocumentRequest) {
        const { documentId, suggestionsViewMode } = request;
        let endpoint = documentId;
        
        if (suggestionsViewMode) {
            endpoint += `?suggestionsViewMode=${suggestionsViewMode}`;
        }
        
        return await makeGoogleDocsRequest(
            this.userId,
            endpoint,
            { method: 'GET' },
            this.accountId
        );
    }
    
    async create(title: string = 'Untitled Document') {
        return await makeGoogleDocsRequest(
            this.userId,
            '',
            {
                method: 'POST',
                body: JSON.stringify({ title })
            },
            this.accountId
        );
    }
    
    async insertText(documentId: string, index: number, text: string) {
        return await this.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    { insertText: { location: { index }, text } }
                ]
            }
        });
    }
    
    async deleteRange(documentId: string, startIndex: number, endIndex: number) {
        return await this.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    { deleteContentRange: { range: { startIndex, endIndex } } }
                ]
            }
        });
    }
    
    async replaceText(documentId: string, startIndex: number, endIndex: number, newText: string) {
        return await this.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    { deleteContentRange: { range: { startIndex, endIndex } } },
                    { insertText: { location: { index: startIndex }, text: newText } }
                ]
            }
        });
    }
}

export async function getGoogleDocsClient(userId: string, accountId?: string) {
    const accounts = await getGoogleDocsAccounts(userId);
    
    if (!accounts || accounts.length === 0) {
        throw new Error("No Google Docs accounts found for user");
    }
    
    return new GoogleDocsClient(userId, accountId || accounts[0].id);
}