/**
 * Wrapped Tools Index
 * Exports all high-level AI tools for Notion
 */

export { createSmartNotionAssistant } from './smartNotionAssistant';

// Re-export the main tools
export { createNotionTools } from '../tools';

import { createNotionTools } from '../tools';

// Convenience function to create all Notion tools
export function createAllNotionTools(userId: string, defaultAccountId?: string) {
    const tools = createNotionTools(userId, defaultAccountId);
    return {
        getNotionPage: tools.getNotionPage,
        getNotionPageContent: tools.getNotionPageContent,
        createNotionPage: tools.createNotionPage,
        // findNotionDatabase: tools.findNotionDatabase,
        // queryNotionDatabase: tools.queryNotionDatabase,
        addNotionDatabaseRecord: tools.addNotionDatabaseRecord,
        searchNotion: tools.searchNotion,
    };
}