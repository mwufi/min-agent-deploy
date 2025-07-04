/**
 * Wrapped Tools Index
 * Exports all high-level AI tools for Notion
 */

export { createSmartNotionAssistant } from './smartNotionAssistant';

// Re-export the main tools
export { createNotionTools } from '../tools';

// Convenience function to create all Notion tools
export function createAllNotionTools(userId: string, defaultAccountId?: string) {
    const { createNotionTools } = require('../tools');
    const { createSmartNotionAssistant } = require('./smartNotionAssistant');
    
    return {
        // All standard tools
        ...createNotionTools(userId, defaultAccountId),
        
        // Smart assistant
        smartNotionAssistant: createSmartNotionAssistant(userId, defaultAccountId)
    };
}