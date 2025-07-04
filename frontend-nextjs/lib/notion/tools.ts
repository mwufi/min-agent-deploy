import { tool } from "ai";
import { z } from "zod";
import {
    getPage,
    getPageContent,
    createPageWithContent,
    updatePage,
    archivePage,
    getSubPages,
    getDatabase,
    queryDatabase,
    addRecordToDatabase,
    findDatabaseByName,
    getDatabaseSchema,
    searchNotion,
    appendBlocks,
    BlockBuilders,
    FilterBuilders,
    SortBuilders
} from './core';
import { createPropertyValue, getPageTitle, simplifyDatabaseProperties } from './utils/parser';

export const createNotionTools = (userId: string, defaultAccountId?: string) => {
    return {
        // Page Tools
        getNotionPage: tool({
            description: 'Get a Notion page by ID, including its properties',
            parameters: z.object({
                pageId: z.string().describe('The ID of the page to retrieve'),
                accountId: z.string().optional()
            }),
            execute: async ({ pageId, accountId }) => {
                try {
                    const page = await getPage(userId, pageId, accountId || defaultAccountId);
                    return {
                        success: true,
                        page: {
                            id: page.id,
                            title: getPageTitle(page.properties),
                            properties: simplifyDatabaseProperties(page.properties),
                            url: page.url,
                            created: page.created_time,
                            lastEdited: page.last_edited_time,
                            archived: page.archived,
                            parent: page.parent
                        }
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to get page: ${error}`,
                        suggestion: "Make sure the page ID is correct and you have access to it"
                    };
                }
            }
        }),

        getNotionPageContent: tool({
            description: 'Get the content of a Notion page as markdown or blocks',
            parameters: z.object({
                pageId: z.string().describe('The ID of the page'),
                format: z.enum(['markdown', 'blocks']).optional().default('markdown'),
                accountId: z.string().optional()
            }),
            execute: async ({ pageId, format, accountId }) => {
                try {
                    const content = await getPageContent(userId, pageId, format, accountId || defaultAccountId);
                    const page = await getPage(userId, pageId, accountId || defaultAccountId);
                    
                    return {
                        success: true,
                        title: getPageTitle(page.properties),
                        content,
                        format,
                        url: page.url
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to get page content: ${error}`,
                        suggestion: "Check if the page exists and you have permission to access it"
                    };
                }
            }
        }),

        createNotionPage: tool({
            description: 'Create a new Notion page with content',
            parameters: z.object({
                title: z.string().describe('The title of the page'),
                content: z.string().optional().describe('The content of the page (text or markdown-like)'),
                parentPageId: z.string().optional().describe('ID of parent page (if creating sub-page)'),
                parentDatabaseId: z.string().optional().describe('ID of database (if creating database entry)'),
                icon: z.string().optional().describe('Emoji icon for the page'),
                coverUrl: z.string().optional().describe('URL of cover image'),
                accountId: z.string().optional()
            }),
            execute: async ({ title, content, parentPageId, parentDatabaseId, icon, coverUrl, accountId }) => {
                try {
                    // Determine parent
                    let parent: any = { type: 'workspace' };
                    if (parentDatabaseId) {
                        parent = { type: 'database_id', database_id: parentDatabaseId };
                    } else if (parentPageId) {
                        parent = { type: 'page_id', page_id: parentPageId };
                    }

                    const page = await createPageWithContent(
                        userId,
                        {
                            title,
                            parent,
                            content,
                            icon,
                            cover: coverUrl
                        },
                        accountId || defaultAccountId
                    );

                    return {
                        success: true,
                        pageId: page.id,
                        url: page.url,
                        title,
                        message: 'Page created successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to create page: ${error}`,
                        suggestion: "Check parent IDs and ensure you have permission to create pages"
                    };
                }
            }
        }),

        updateNotionPage: tool({
            description: 'Update properties of a Notion page',
            parameters: z.object({
                pageId: z.string().describe('The ID of the page to update'),
                properties: z.record(z.any()).describe('Properties to update (key-value pairs)'),
                archived: z.boolean().optional().describe('Archive or unarchive the page'),
                icon: z.string().optional().describe('New emoji icon'),
                coverUrl: z.string().optional().describe('New cover image URL'),
                accountId: z.string().optional()
            }),
            execute: async ({ pageId, properties, archived, icon, coverUrl, accountId }) => {
                try {
                    // Get the page first to understand its schema
                    const page = await getPage(userId, pageId, accountId || defaultAccountId);
                    
                    // Format properties based on existing schema
                    const formattedProperties: Record<string, any> = {};
                    for (const [key, value] of Object.entries(properties)) {
                        if (page.properties[key]) {
                            const propertyType = page.properties[key].type;
                            formattedProperties[key] = createPropertyValue(propertyType, value);
                        }
                    }

                    const options: any = {};
                    if (archived !== undefined) options.archived = archived;
                    if (icon) options.icon = { type: 'emoji', emoji: icon };
                    if (coverUrl) options.cover = { type: 'external', external: { url: coverUrl } };

                    const updated = await updatePage(
                        userId,
                        pageId,
                        formattedProperties,
                        options,
                        accountId || defaultAccountId
                    );

                    return {
                        success: true,
                        pageId: updated.id,
                        url: updated.url,
                        message: 'Page updated successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to update page: ${error}`,
                        suggestion: "Check property names and values match the page schema"
                    };
                }
            }
        }),

        getNotionSubPages: tool({
            description: 'Get all sub-pages of a Notion page',
            parameters: z.object({
                pageId: z.string().describe('The ID of the parent page'),
                accountId: z.string().optional()
            }),
            execute: async ({ pageId, accountId }) => {
                try {
                    const subPages = await getSubPages(userId, pageId, accountId || defaultAccountId);
                    
                    return {
                        success: true,
                        subPages: subPages.map(page => ({
                            id: page.id,
                            title: getPageTitle(page.properties),
                            url: page.url,
                            created: page.created_time,
                            lastEdited: page.last_edited_time
                        })),
                        count: subPages.length
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to get sub-pages: ${error}`,
                        suggestion: "Make sure the page ID is correct and it has sub-pages"
                    };
                }
            }
        }),

        // Database Tools
        findNotionDatabase: tool({
            description: 'Find a Notion database by name',
            parameters: z.object({
                name: z.string().describe('The name of the database to find'),
                accountId: z.string().optional()
            }),
            execute: async ({ name, accountId }) => {
                try {
                    const database = await findDatabaseByName(userId, name, accountId || defaultAccountId);
                    
                    if (!database) {
                        return {
                            success: false,
                            error: `Database "${name}" not found`,
                            suggestion: "Try searching with a different name or check your spelling"
                        };
                    }

                    return {
                        success: true,
                        database: {
                            id: database.id,
                            title: database.title[0]?.plain_text || 'Untitled',
                            url: database.url,
                            properties: Object.keys(database.properties)
                        }
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to find database: ${error}`,
                        suggestion: "Make sure you have access to the workspace"
                    };
                }
            }
        }),

        queryNotionDatabase: tool({
            description: 'Query a Notion database with filters and sorting',
            parameters: z.object({
                databaseId: z.string().describe('The ID of the database'),
                filter: z.any().optional().describe('Filter object (use FilterBuilders)'),
                sorts: z.array(z.any()).optional().describe('Sort criteria'),
                limit: z.number().optional().describe('Maximum number of results'),
                accountId: z.string().optional()
            }),
            execute: async ({ databaseId, filter, sorts, limit, accountId }) => {
                try {
                    const params: any = {};
                    if (filter) params.filter = filter;
                    if (sorts) params.sorts = sorts;
                    if (limit) params.page_size = limit;

                    const result = await queryDatabase(userId, databaseId, params, accountId || defaultAccountId);
                    
                    return {
                        success: true,
                        results: result.results.map(page => ({
                            id: page.id,
                            properties: simplifyDatabaseProperties(page.properties),
                            url: page.url,
                            created: page.created_time,
                            lastEdited: page.last_edited_time
                        })),
                        count: result.results.length,
                        hasMore: result.has_more
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to query database: ${error}`,
                        suggestion: "Check the database ID and filter syntax"
                    };
                }
            }
        }),

        addNotionDatabaseRecord: tool({
            description: 'Add a new record to a Notion database',
            parameters: z.object({
                databaseId: z.string().describe('The ID of the database'),
                properties: z.record(z.any()).describe('Record properties as key-value pairs'),
                icon: z.string().optional().describe('Emoji icon for the record'),
                coverUrl: z.string().optional().describe('Cover image URL'),
                accountId: z.string().optional()
            }),
            execute: async ({ databaseId, properties, icon, coverUrl, accountId }) => {
                try {
                    const options: any = {};
                    if (icon) options.icon = { type: 'emoji', emoji: icon };
                    if (coverUrl) options.cover = { type: 'external', external: { url: coverUrl } };

                    const page = await addRecordToDatabase(
                        userId,
                        databaseId,
                        properties,
                        options,
                        accountId || defaultAccountId
                    );

                    return {
                        success: true,
                        recordId: page.id,
                        url: page.url,
                        message: 'Record added successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to add record: ${error}`,
                        suggestion: "Check that property names and values match the database schema"
                    };
                }
            }
        }),

        getNotionDatabaseSchema: tool({
            description: 'Get the schema (property definitions) of a Notion database',
            parameters: z.object({
                databaseId: z.string().describe('The ID of the database'),
                accountId: z.string().optional()
            }),
            execute: async ({ databaseId, accountId }) => {
                try {
                    const schema = await getDatabaseSchema(userId, databaseId, accountId || defaultAccountId);
                    
                    const properties = Object.entries(schema).map(([name, config]: [string, any]) => ({
                        name,
                        type: config.type,
                        id: config.id,
                        ...(config.select && { options: config.select.options }),
                        ...(config.multi_select && { options: config.multi_select.options }),
                        ...(config.relation && { 
                            database_id: config.relation.database_id,
                            synced_property_name: config.relation.synced_property_name 
                        })
                    }));

                    return {
                        success: true,
                        properties,
                        propertyNames: Object.keys(schema)
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to get database schema: ${error}`,
                        suggestion: "Make sure the database ID is correct"
                    };
                }
            }
        }),

        // Search Tool
        searchNotion: tool({
            description: 'Search across all Notion content (pages and databases)',
            parameters: z.object({
                query: z.string().describe('Search query'),
                type: z.enum(['page', 'database', 'all']).optional().default('all'),
                accountId: z.string().optional()
            }),
            execute: async ({ query, type, accountId }) => {
                try {
                    const options: any = {};
                    if (type !== 'all') {
                        options.filter = {
                            value: type === 'page' ? 'page' : 'database',
                            property: 'object'
                        };
                    }

                    const results = await searchNotion(userId, query, options, accountId || defaultAccountId);
                    
                    return {
                        success: true,
                        results: results.results.map((item: any) => ({
                            id: item.id,
                            type: item.object,
                            title: item.object === 'page' 
                                ? getPageTitle(item.properties)
                                : item.title?.[0]?.plain_text || 'Untitled',
                            url: item.url,
                            lastEdited: item.last_edited_time
                        })),
                        count: results.results.length
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Search failed: ${error}`,
                        suggestion: "Try a different search query"
                    };
                }
            }
        }),

        // Block manipulation tool
        appendNotionBlocks: tool({
            description: 'Append blocks (content) to a Notion page',
            parameters: z.object({
                pageId: z.string().describe('The ID of the page to append to'),
                blocks: z.array(z.any()).describe('Array of block objects to append'),
                accountId: z.string().optional()
            }),
            execute: async ({ pageId, blocks, accountId }) => {
                try {
                    const result = await appendBlocks(userId, pageId, blocks, accountId || defaultAccountId);
                    
                    return {
                        success: true,
                        blocksAdded: result.results.length,
                        message: 'Blocks appended successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to append blocks: ${error}`,
                        suggestion: "Check block format and page permissions"
                    };
                }
            }
        })
    };
};