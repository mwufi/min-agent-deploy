import { tool } from 'ai';
import { z } from 'zod';

// The `tool` helper function ensures correct type inference
export const getConnectedServices = tool({
    description: 'Get a list of connected Pipedream services',
    parameters: z.object({}),
    execute: async () => {
        console.log('getting connected services');
        await new Promise(resolve => setTimeout(resolve, 3000));
        // In a real app, you'd fetch this from your Pipedream client
        return [
            { name: 'Google Drive', id: '123' },
            { name: 'Gmail', id: '456' },
            { name: 'Asana', id: '789' },
        ];
    },
});

export const getConnectionDetails = tool({
    description: 'Get the details of a specific Pipedream connection by its ID',
    parameters: z.object({
        id: z.string().describe('The ID of the connection to retrieve'),
    }),
    execute: async ({ id }) => {
        console.log(`getting connection details for ${id}`);
        // In a real app, you'd fetch this from your Pipedream client
        return { id, foo: 'bar', baz: 'qux', connected_at: '2025-07-01T12:00:00Z' };
    },
});

export const searchForPipedreamApps = tool({
    description: 'Search for available Pipedream apps to connect to',
    parameters: z.object({
        query: z.string().describe('The name of the service to search for, e.g., "Gmail" or "Slack"'),
    }),
    execute: async ({ query }) => {
        console.log(`searching for pipedream apps with query: ${query}`);
        // In a real app, you'd call the Pipedream API
        if (query.toLowerCase().includes('gmail')) {
            return [{ name: 'Gmail', app: 'gmail', component: 'gmail_component' }];
        }
        if (query.toLowerCase().includes('google')) {
            return [
                { name: 'Gmail', app: 'gmail', component: 'gmail_component' },
                { name: 'Google Drive', app: 'google_drive', component: 'google_drive_component' },
                { name: 'Google Sheets', app: 'google_sheets', component: 'google_sheets_component' },
            ];
        }
        return [];
    },
});

// Export all tools as a single object for easy import
export const pipedreamTools = {
    getConnectedServices,
    getConnectionDetails,
    searchForPipedreamApps,
}; 