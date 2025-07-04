import { makeNotionRequest, NotionPage } from '../client';
import { blocksToMarkdown } from '../utils/parser';
import { getBlockChildren } from './blocks';

// Retrieve a page by ID
export async function getPage(
    userId: string,
    pageId: string,
    accountId?: string
): Promise<NotionPage> {
    return makeNotionRequest<NotionPage>(
        userId,
        `/pages/${pageId}`,
        { method: 'GET' },
        accountId
    );
}

// Create a new page
export async function createPage(
    userId: string,
    params: {
        parent: {
            type: 'database_id' | 'page_id' | 'workspace';
            database_id?: string;
            page_id?: string;
        };
        properties: Record<string, any>;
        children?: any[];
        icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
        cover?: { type: 'external'; external: { url: string } };
    },
    accountId?: string
): Promise<NotionPage> {
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

// Update page properties
export async function updatePage(
    userId: string,
    pageId: string,
    properties: Record<string, any>,
    options?: {
        archived?: boolean;
        icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
        cover?: { type: 'external'; external: { url: string } };
    },
    accountId?: string
): Promise<NotionPage> {
    return makeNotionRequest<NotionPage>(
        userId,
        `/pages/${pageId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({
                properties,
                ...options
            })
        },
        accountId
    );
}

// Archive or unarchive a page
export async function archivePage(
    userId: string,
    pageId: string,
    archived: boolean = true,
    accountId?: string
): Promise<NotionPage> {
    return makeNotionRequest<NotionPage>(
        userId,
        `/pages/${pageId}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ archived })
        },
        accountId
    );
}

// Get page content as blocks
export async function getPageContent(
    userId: string,
    pageId: string,
    format: 'blocks' | 'markdown' = 'blocks',
    accountId?: string
): Promise<any> {
    const blocks = await getBlockChildren(userId, pageId, accountId);
    
    if (format === 'markdown') {
        return blocksToMarkdown(blocks);
    }
    
    return blocks;
}

// Get sub-pages of a page
export async function getSubPages(
    userId: string,
    pageId: string,
    accountId?: string
): Promise<NotionPage[]> {
    // Get all child blocks
    const blocks = await getBlockChildren(userId, pageId, accountId);
    
    // Filter for child_page blocks
    const childPageBlocks = blocks.filter(block => block.type === 'child_page');
    
    // Fetch full page details for each child page
    const subPages = await Promise.all(
        childPageBlocks.map(block => getPage(userId, block.id, accountId))
    );
    
    return subPages;
}

// Create a simple page with content
export async function createPageWithContent(
    userId: string,
    params: {
        title: string;
        parent: {
            type: 'database_id' | 'page_id' | 'workspace';
            database_id?: string;
            page_id?: string;
        };
        content?: string | any[]; // String for markdown, array for blocks
        icon?: string; // Emoji
        cover?: string; // URL
    },
    accountId?: string
): Promise<NotionPage> {
    // Prepare properties based on parent type
    const properties: Record<string, any> = {};
    
    if (params.parent.type === 'database_id') {
        // For database pages, we need to know the title property name
        // This is a simplified version - in practice you'd query the database schema
        properties['Name'] = {
            title: [
                {
                    text: {
                        content: params.title
                    }
                }
            ]
        };
    }
    
    // Prepare children blocks if content is provided
    let children: any[] = [];
    
    if (params.content) {
        if (typeof params.content === 'string') {
            // Convert markdown-like content to blocks (simplified)
            const lines = params.content.split('\n');
            children = lines
                .filter(line => line.trim())
                .map(line => ({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: line
                                }
                            }
                        ]
                    }
                }));
        } else {
            children = params.content;
        }
    }
    
    // If creating a standalone page (not in database), add title as heading
    if (params.parent.type !== 'database_id' && params.title) {
        children.unshift({
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: params.title
                        }
                    }
                ]
            }
        });
    }
    
    const pageParams: any = {
        parent: params.parent,
        properties,
        children
    };
    
    if (params.icon) {
        pageParams.icon = {
            type: 'emoji',
            emoji: params.icon
        };
    }
    
    if (params.cover) {
        pageParams.cover = {
            type: 'external',
            external: {
                url: params.cover
            }
        };
    }
    
    return createPage(userId, pageParams, accountId);
}