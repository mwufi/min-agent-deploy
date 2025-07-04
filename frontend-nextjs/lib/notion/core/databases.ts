import { makeNotionRequest, NotionDatabase, NotionPage } from '../client';
import { createPropertyValue } from '../utils/parser';

// Retrieve a database
export async function getDatabase(
    userId: string,
    databaseId: string,
    accountId?: string
): Promise<NotionDatabase> {
    return makeNotionRequest<NotionDatabase>(
        userId,
        `/databases/${databaseId}`,
        { method: 'GET' },
        accountId
    );
}

// Query a database with filters and sorts
export async function queryDatabase(
    userId: string,
    databaseId: string,
    params: {
        filter?: any;
        sorts?: any[];
        start_cursor?: string;
        page_size?: number;
    } = {},
    accountId?: string
): Promise<{
    results: NotionPage[];
    has_more: boolean;
    next_cursor?: string;
}> {
    const response = await makeNotionRequest<{
        results: NotionPage[];
        has_more: boolean;
        next_cursor?: string;
    }>(
        userId,
        `/databases/${databaseId}/query`,
        {
            method: 'POST',
            body: JSON.stringify(params)
        },
        accountId
    );

    // If there are more pages and no explicit page_size, fetch all
    if (response.has_more && response.next_cursor && !params.page_size) {
        const nextPageResults = await queryDatabase(
            userId,
            databaseId,
            { ...params, start_cursor: response.next_cursor },
            accountId
        );
        return {
            results: [...response.results, ...nextPageResults.results],
            has_more: nextPageResults.has_more,
            next_cursor: nextPageResults.next_cursor
        };
    }

    return response;
}

// Create a new database
export async function createDatabase(
    userId: string,
    params: {
        parent: {
            type: 'page_id' | 'workspace';
            page_id?: string;
        };
        title: string;
        properties: Record<string, any>;
        icon?: { type: 'emoji'; emoji: string };
        cover?: { type: 'external'; external: { url: string } };
        is_inline?: boolean;
    },
    accountId?: string
): Promise<NotionDatabase> {
    const body = {
        parent: params.parent,
        title: [
            {
                type: 'text',
                text: {
                    content: params.title
                }
            }
        ],
        properties: params.properties,
        icon: params.icon,
        cover: params.cover,
        is_inline: params.is_inline || false
    };

    return makeNotionRequest<NotionDatabase>(
        userId,
        '/databases',
        {
            method: 'POST',
            body: JSON.stringify(body)
        },
        accountId
    );
}

// Update database properties
export async function updateDatabase(
    userId: string,
    databaseId: string,
    params: {
        title?: string;
        properties?: Record<string, any>;
        icon?: { type: 'emoji'; emoji: string };
        cover?: { type: 'external'; external: { url: string } };
        archived?: boolean;
    },
    accountId?: string
): Promise<NotionDatabase> {
    const body: any = {};

    if (params.title) {
        body.title = [
            {
                type: 'text',
                text: {
                    content: params.title
                }
            }
        ];
    }

    if (params.properties) body.properties = params.properties;
    if (params.icon) body.icon = params.icon;
    if (params.cover) body.cover = params.cover;
    if (params.archived !== undefined) body.archived = params.archived;

    return makeNotionRequest<NotionDatabase>(
        userId,
        `/databases/${databaseId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(body)
        },
        accountId
    );
}

// Get database schema (properties configuration)
export async function getDatabaseSchema(
    userId: string,
    databaseId: string,
    accountId?: string
): Promise<Record<string, any>> {
    const database = await getDatabase(userId, databaseId, accountId);
    return database.properties;
}

// Add a record to a database
export async function addRecordToDatabase(
    userId: string,
    databaseId: string,
    properties: Record<string, any>,
    options?: {
        icon?: { type: 'emoji'; emoji: string };
        cover?: { type: 'external'; external: { url: string } };
        children?: any[];
    },
    accountId?: string
): Promise<NotionPage> {
    // Get database schema to properly format properties
    const schema = await getDatabaseSchema(userId, databaseId, accountId);
    
    // Format properties according to schema
    const formattedProperties: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
        if (schema[key]) {
            const propertyType = schema[key].type;
            formattedProperties[key] = createPropertyValue(propertyType, value);
        }
    }

    const params: any = {
        parent: {
            type: 'database_id',
            database_id: databaseId
        },
        properties: formattedProperties
    };

    if (options?.icon) params.icon = options.icon;
    if (options?.cover) params.cover = options.cover;
    if (options?.children) params.children = options.children;

    return makeNotionRequest<NotionPage>(
        userId,
        '/pages',
        {
            method: 'POST',
            body: JSON.stringify(params)
        },
        accountId
    );
}

// Find a database by name
export async function findDatabaseByName(
    userId: string,
    name: string,
    accountId?: string
): Promise<NotionDatabase | null> {
    const searchResponse = await makeNotionRequest<{
        results: any[];
    }>(
        userId,
        '/search',
        {
            method: 'POST',
            body: JSON.stringify({
                query: name,
                filter: {
                    value: 'database',
                    property: 'object'
                }
            })
        },
        accountId
    );

    // Find exact match first
    let database = searchResponse.results.find(
        db => db.title?.[0]?.plain_text?.toLowerCase() === name.toLowerCase()
    );

    // If no exact match, find partial match
    if (!database) {
        database = searchResponse.results.find(
            db => db.title?.[0]?.plain_text?.toLowerCase().includes(name.toLowerCase())
        );
    }

    return database || null;
}

// Helper to build database filters
export const FilterBuilders = {
    // Text filters
    titleEquals: (value: string) => ({
        property: 'title',
        title: { equals: value }
    }),
    
    titleContains: (value: string) => ({
        property: 'title',
        title: { contains: value }
    }),
    
    richTextEquals: (property: string, value: string) => ({
        property,
        rich_text: { equals: value }
    }),
    
    richTextContains: (property: string, value: string) => ({
        property,
        rich_text: { contains: value }
    }),
    
    // Number filters
    numberEquals: (property: string, value: number) => ({
        property,
        number: { equals: value }
    }),
    
    numberGreaterThan: (property: string, value: number) => ({
        property,
        number: { greater_than: value }
    }),
    
    numberLessThan: (property: string, value: number) => ({
        property,
        number: { less_than: value }
    }),
    
    // Checkbox filter
    checkbox: (property: string, value: boolean) => ({
        property,
        checkbox: { equals: value }
    }),
    
    // Select filters
    selectEquals: (property: string, value: string) => ({
        property,
        select: { equals: value }
    }),
    
    multiSelectContains: (property: string, value: string) => ({
        property,
        multi_select: { contains: value }
    }),
    
    // Date filters
    dateEquals: (property: string, value: string) => ({
        property,
        date: { equals: value }
    }),
    
    dateBefore: (property: string, value: string) => ({
        property,
        date: { before: value }
    }),
    
    dateAfter: (property: string, value: string) => ({
        property,
        date: { after: value }
    }),
    
    // Compound filters
    and: (...filters: any[]) => ({
        and: filters
    }),
    
    or: (...filters: any[]) => ({
        or: filters
    })
};

// Helper to build sorts
export const SortBuilders = {
    property: (property: string, direction: 'ascending' | 'descending' = 'ascending') => ({
        property,
        direction
    }),
    
    created: (direction: 'ascending' | 'descending' = 'descending') => ({
        timestamp: 'created_time',
        direction
    }),
    
    lastEdited: (direction: 'ascending' | 'descending' = 'descending') => ({
        timestamp: 'last_edited_time',
        direction
    })
};