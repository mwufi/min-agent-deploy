import pd from "../server/pipedream_client";

// Notion API types
export interface NotionAccount {
    id: string;
    name?: string;
    email?: string;
    workspace_name?: string;
}

export interface NotionBlock {
    object: 'block';
    id: string;
    type: string;
    created_time: string;
    last_edited_time: string;
    created_by?: { id: string };
    last_edited_by?: { id: string };
    has_children: boolean;
    archived: boolean;
    parent?: {
        type: 'page_id' | 'block_id' | 'database_id' | 'workspace';
        page_id?: string;
        block_id?: string;
        database_id?: string;
    };
    [key: string]: any; // For type-specific properties
}

export interface NotionPage {
    object: 'page';
    id: string;
    created_time: string;
    last_edited_time: string;
    created_by?: { id: string };
    last_edited_by?: { id: string };
    cover?: { type: string; [key: string]: any };
    icon?: { type: string; [key: string]: any };
    parent: {
        type: 'database_id' | 'page_id' | 'workspace';
        database_id?: string;
        page_id?: string;
    };
    archived: boolean;
    properties: Record<string, any>;
    url?: string;
}

export interface NotionDatabase {
    object: 'database';
    id: string;
    created_time: string;
    last_edited_time: string;
    created_by?: { id: string };
    last_edited_by?: { id: string };
    title: Array<any>;
    description?: Array<any>;
    icon?: { type: string; [key: string]: any };
    cover?: { type: string; [key: string]: any };
    properties: Record<string, any>;
    parent: {
        type: 'page_id' | 'workspace';
        page_id?: string;
    };
    url?: string;
    archived: boolean;
    is_inline: boolean;
}

// Helper to get Notion accounts
export async function getNotionAccounts(userId: string): Promise<NotionAccount[]> {
    try {
        const accounts = await pd.getAccounts({
            external_user_id: userId,
        });
        const notionAccounts = accounts.data?.filter((account: any) =>
            account.app?.name?.toLowerCase() === "notion"
        ) || [];
        return notionAccounts;
    } catch (error) {
        console.error("Error fetching Notion accounts:", error);
        return [];
    }
}

// Base function for making Notion API requests
export async function makeNotionRequest<T = any>(
    userId: string,
    endpoint: string,
    options: any = {},
    accountId?: string
): Promise<T> {
    const notionAccounts = await getNotionAccounts(userId);
    if (notionAccounts.length === 0) {
        throw new Error('No Notion accounts found');
    }

    const targetAccountId = accountId || notionAccounts[0].id;
    const targetAccount = notionAccounts.find(acc => acc.id === targetAccountId);
    if (!targetAccount) {
        throw new Error(`Notion account ${targetAccountId} not found`);
    }

    try {
        // Set default headers for Notion API
        const headers = {
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const response = await pd.makeProxyRequest(
            {
                searchParams: {
                    account_id: targetAccountId,
                    external_user_id: userId,
                }
            },
            {
                url: `https://api.notion.com/v1${endpoint}`,
                options: {
                    ...options,
                    headers
                }
            }
        );

        // Parse response if it's a string
        if (typeof response === 'string') {
            return JSON.parse(response) as T;
        }
        return response as T;
    } catch (error) {
        console.error("Notion API error:", error);
        throw error;
    }
}

// Search across all Notion content
export async function searchNotion(
    userId: string,
    query: string,
    options: {
        filter?: {
            value: 'page' | 'database';
            property: 'object';
        };
        sort?: {
            direction: 'ascending' | 'descending';
            timestamp: 'last_edited_time';
        };
        page_size?: number;
        start_cursor?: string;
    } = {},
    accountId?: string
) {
    return makeNotionRequest(
        userId,
        '/search',
        {
            method: 'POST',
            body: JSON.stringify({
                query,
                ...options
            })
        },
        accountId
    );
}

// Get workspace users
export async function getNotionUsers(
    userId: string,
    options: {
        page_size?: number;
        start_cursor?: string;
    } = {},
    accountId?: string
) {
    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.start_cursor) params.append('start_cursor', options.start_cursor);

    return makeNotionRequest(
        userId,
        `/users${params.toString() ? `?${params.toString()}` : ''}`,
        { method: 'GET' },
        accountId
    );
}

// Get bot user info
export async function getNotionBotUser(userId: string, accountId?: string) {
    return makeNotionRequest(
        userId,
        '/users/me',
        { method: 'GET' },
        accountId
    );
}