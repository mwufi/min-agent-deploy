import { tool } from "ai";
import { z } from "zod";
import {
    searchNotion,
    findDatabaseByName,
    queryDatabase,
    addRecordToDatabase,
    createPageWithContent,
    getPageContent,
    BlockBuilders,
    FilterBuilders
} from '../core';

/**
 * Smart Notion Assistant Tool
 * This is a high-level tool that can intelligently handle complex Notion operations
 */
export const createSmartNotionAssistant = (userId: string, defaultAccountId?: string) => {
    return tool({
        description: 'Intelligent Notion assistant that can handle complex requests like "Add a meeting note to my Notes database" or "Create a project page with tasks"',
        parameters: z.object({
            request: z.string().describe('Natural language request for Notion operation'),
            context: z.object({
                databaseHints: z.array(z.string()).optional().describe('Possible database names mentioned'),
                pageHints: z.array(z.string()).optional().describe('Possible page titles mentioned'),
                dateContext: z.string().optional().describe('Date context if mentioned'),
                contentType: z.enum(['note', 'task', 'project', 'meeting', 'general']).optional()
            }).optional(),
            accountId: z.string().optional()
        }),
        execute: async ({ request, context, accountId }) => {
            const targetAccountId = accountId || defaultAccountId;
            
            try {
                // Analyze the request to determine intent
                const lowerRequest = request.toLowerCase();
                
                // Handle database operations
                if (lowerRequest.includes('add') && (lowerRequest.includes('database') || lowerRequest.includes('to my'))) {
                    // Extract database name
                    let databaseName = '';
                    if (context?.databaseHints?.length) {
                        databaseName = context.databaseHints[0];
                    } else {
                        // Try to extract from request
                        const dbMatch = request.match(/(?:to my|in my|to the|in the)\s+(\w+)\s+(?:database|db)/i);
                        if (dbMatch) databaseName = dbMatch[1];
                    }
                    
                    if (!databaseName) {
                        return {
                            success: false,
                            error: 'Could not determine which database to use',
                            suggestion: 'Please specify the database name more clearly'
                        };
                    }
                    
                    // Find the database
                    const db = await findDatabaseByName(userId, databaseName, targetAccountId);
                    if (!db) {
                        return {
                            success: false,
                            error: `Database "${databaseName}" not found`,
                            suggestion: `Available databases can be found using the search tool`
                        };
                    }
                    
                    // Prepare properties based on content type
                    const properties: Record<string, any> = {};
                    
                    // Extract title/name
                    const titleMatch = request.match(/(?:called|titled|named)\s+"([^"]+)"/i) ||
                                       request.match(/(?:note|task|item)\s+(?:about|for)\s+"([^"]+)"/i);
                    const title = titleMatch ? titleMatch[1] : `New ${context?.contentType || 'Item'}`;
                    
                    // Common property names
                    const titleProps = ['Title', 'Name', 'title', 'name'];
                    for (const prop of titleProps) {
                        if (db.properties[prop]) {
                            properties[prop] = title;
                            break;
                        }
                    }
                    
                    // Add date if mentioned
                    if (context?.dateContext || lowerRequest.includes('today')) {
                        const dateProps = ['Date', 'date', 'Created', 'Due Date'];
                        for (const prop of dateProps) {
                            if (db.properties[prop]) {
                                properties[prop] = context?.dateContext || new Date().toISOString();
                                break;
                            }
                        }
                    }
                    
                    // Add content type as tag/status if applicable
                    if (context?.contentType) {
                        const tagProps = ['Tags', 'Type', 'Category', 'Status'];
                        for (const prop of tagProps) {
                            if (db.properties[prop]) {
                                properties[prop] = context.contentType;
                                break;
                            }
                        }
                    }
                    
                    // Create the record
                    const result = await addRecordToDatabase(userId, db.id, properties, {}, targetAccountId);
                    
                    return {
                        success: true,
                        action: 'added_to_database',
                        database: databaseName,
                        recordId: result.id,
                        url: result.url,
                        properties,
                        message: `Added "${title}" to ${databaseName} database`
                    };
                }
                
                // Handle page creation
                if (lowerRequest.includes('create') && lowerRequest.includes('page')) {
                    const titleMatch = request.match(/(?:page|document)\s+(?:called|titled|named|about|for)\s+"([^"]+)"/i) ||
                                       request.match(/(?:create a?)\s+(\w+)\s+page/i);
                    const title = titleMatch ? titleMatch[1] : 'New Page';
                    
                    // Determine content based on type
                    let content: any[] = [];
                    
                    if (lowerRequest.includes('project')) {
                        content = [
                            BlockBuilders.heading1(title),
                            BlockBuilders.heading2('Overview'),
                            BlockBuilders.paragraph('Project description goes here...'),
                            BlockBuilders.heading2('Goals'),
                            BlockBuilders.bulletedListItem('Goal 1'),
                            BlockBuilders.bulletedListItem('Goal 2'),
                            BlockBuilders.heading2('Timeline'),
                            BlockBuilders.paragraph('Timeline details...'),
                            BlockBuilders.heading2('Tasks'),
                            BlockBuilders.todo('Define requirements', false),
                            BlockBuilders.todo('Create design', false),
                            BlockBuilders.todo('Implementation', false)
                        ];
                    } else if (lowerRequest.includes('meeting')) {
                        const date = new Date().toLocaleDateString();
                        content = [
                            BlockBuilders.heading1(`${title} - ${date}`),
                            BlockBuilders.heading2('Attendees'),
                            BlockBuilders.bulletedListItem(''),
                            BlockBuilders.heading2('Agenda'),
                            BlockBuilders.bulletedListItem(''),
                            BlockBuilders.heading2('Discussion'),
                            BlockBuilders.paragraph(''),
                            BlockBuilders.heading2('Action Items'),
                            BlockBuilders.todo('', false),
                            BlockBuilders.heading2('Next Steps'),
                            BlockBuilders.paragraph('')
                        ];
                    } else {
                        content = [
                            BlockBuilders.heading1(title),
                            BlockBuilders.paragraph('Content goes here...')
                        ];
                    }
                    
                    const page = await createPageWithContent(
                        userId,
                        {
                            title,
                            parent: { type: 'workspace' },
                            content: content,
                            icon: lowerRequest.includes('project') ? '📋' : 
                                  lowerRequest.includes('meeting') ? '🤝' : '📄'
                        },
                        targetAccountId
                    );
                    
                    return {
                        success: true,
                        action: 'created_page',
                        pageId: page.id,
                        url: page.url,
                        title,
                        message: `Created ${title} page`
                    };
                }
                
                // Handle search operations
                if (lowerRequest.includes('find') || lowerRequest.includes('search')) {
                    const queryMatch = request.match(/(?:find|search for)\s+"([^"]+)"/i) ||
                                      request.match(/(?:find|search for)\s+(\w+(?:\s+\w+)*)/i);
                    const query = queryMatch ? queryMatch[1] : request;
                    
                    const results = await searchNotion(userId, query, {}, targetAccountId);
                    
                    return {
                        success: true,
                        action: 'search',
                        query,
                        results: results.results.map((item: any) => ({
                            id: item.id,
                            type: item.object,
                            title: item.title?.[0]?.plain_text || 'Untitled',
                            url: item.url
                        })),
                        count: results.results.length,
                        message: `Found ${results.results.length} results for "${query}"`
                    };
                }
                
                // Default response for unrecognized requests
                return {
                    success: false,
                    error: 'Could not understand the request',
                    suggestion: 'Try requests like "Add a meeting note to my Notes database" or "Create a project page called Project X"',
                    supportedActions: [
                        'Add records to databases',
                        'Create pages (project, meeting, general)',
                        'Search for content'
                    ]
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: `Operation failed: ${error}`,
                    suggestion: 'Check your request and try again'
                };
            }
        }
    });
};