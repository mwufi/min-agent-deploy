import { makeNotionRequest, NotionBlock } from '../client';

// Get block children with pagination
export async function getBlockChildren(
    userId: string,
    blockId: string,
    accountId?: string,
    options: {
        page_size?: number;
        start_cursor?: string;
    } = {}
): Promise<NotionBlock[]> {
    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.start_cursor) params.append('start_cursor', options.start_cursor);

    const response = await makeNotionRequest<{
        results: NotionBlock[];
        has_more: boolean;
        next_cursor?: string;
    }>(
        userId,
        `/blocks/${blockId}/children${params.toString() ? `?${params.toString()}` : ''}`,
        { method: 'GET' },
        accountId
    );

    // If there are more pages, recursively fetch them
    if (response.has_more && response.next_cursor) {
        const nextPageBlocks = await getBlockChildren(
            userId,
            blockId,
            accountId,
            { ...options, start_cursor: response.next_cursor }
        );
        return [...response.results, ...nextPageBlocks];
    }

    return response.results;
}

// Retrieve a single block
export async function getBlock(
    userId: string,
    blockId: string,
    accountId?: string
): Promise<NotionBlock> {
    return makeNotionRequest<NotionBlock>(
        userId,
        `/blocks/${blockId}`,
        { method: 'GET' },
        accountId
    );
}

// Append blocks to a parent
export async function appendBlocks(
    userId: string,
    parentId: string,
    children: any[],
    accountId?: string
): Promise<{
    results: NotionBlock[];
}> {
    return makeNotionRequest(
        userId,
        `/blocks/${parentId}/children`,
        {
            method: 'PATCH',
            body: JSON.stringify({ children })
        },
        accountId
    );
}

// Update a block
export async function updateBlock(
    userId: string,
    blockId: string,
    blockData: any,
    accountId?: string
): Promise<NotionBlock> {
    const { type, ...typeSpecificData } = blockData;
    
    return makeNotionRequest<NotionBlock>(
        userId,
        `/blocks/${blockId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                [type]: typeSpecificData
            })
        },
        accountId
    );
}

// Delete a block
export async function deleteBlock(
    userId: string,
    blockId: string,
    accountId?: string
): Promise<NotionBlock> {
    return makeNotionRequest<NotionBlock>(
        userId,
        `/blocks/${blockId}`,
        {
            method: 'DELETE'
        },
        accountId
    );
}

// Helper to create different block types
export const BlockBuilders = {
    paragraph: (text: string, options: any = {}) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text },
                    ...options
                }
            ]
        }
    }),

    heading1: (text: string) => ({
        object: 'block',
        type: 'heading_1',
        heading_1: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    heading2: (text: string) => ({
        object: 'block',
        type: 'heading_2',
        heading_2: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    heading3: (text: string) => ({
        object: 'block',
        type: 'heading_3',
        heading_3: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    bulletedListItem: (text: string) => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    numberedListItem: (text: string) => ({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    todo: (text: string, checked: boolean = false) => ({
        object: 'block',
        type: 'to_do',
        to_do: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ],
            checked
        }
    }),

    toggle: (text: string, children: any[] = []) => ({
        object: 'block',
        type: 'toggle',
        toggle: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        },
        children
    }),

    code: (code: string, language: string = 'plain text') => ({
        object: 'block',
        type: 'code',
        code: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: code }
                }
            ],
            language
        }
    }),

    quote: (text: string) => ({
        object: 'block',
        type: 'quote',
        quote: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: text }
                }
            ]
        }
    }),

    divider: () => ({
        object: 'block',
        type: 'divider',
        divider: {}
    }),

    image: (url: string, caption?: string) => ({
        object: 'block',
        type: 'image',
        image: {
            type: 'external',
            external: { url },
            caption: caption ? [
                {
                    type: 'text',
                    text: { content: caption }
                }
            ] : []
        }
    }),

    video: (url: string, caption?: string) => ({
        object: 'block',
        type: 'video',
        video: {
            type: 'external',
            external: { url },
            caption: caption ? [
                {
                    type: 'text',
                    text: { content: caption }
                }
            ] : []
        }
    }),

    file: (url: string, caption?: string) => ({
        object: 'block',
        type: 'file',
        file: {
            type: 'external',
            external: { url },
            caption: caption ? [
                {
                    type: 'text',
                    text: { content: caption }
                }
            ] : []
        }
    }),

    bookmark: (url: string, caption?: string) => ({
        object: 'block',
        type: 'bookmark',
        bookmark: {
            url,
            caption: caption ? [
                {
                    type: 'text',
                    text: { content: caption }
                }
            ] : []
        }
    }),

    equation: (expression: string) => ({
        object: 'block',
        type: 'equation',
        equation: {
            expression
        }
    }),

    tableOfContents: () => ({
        object: 'block',
        type: 'table_of_contents',
        table_of_contents: {}
    })
};