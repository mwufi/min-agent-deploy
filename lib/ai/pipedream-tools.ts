import { tool } from 'ai';
import { z } from 'zod';
import pd from '@/lib/server/pipedream_client';

// Factory function to create tools with userId context
export const createPipedreamTools = (userId: string) => ({
    getConnectedServices: tool({
        description: 'Get a list of connected Pipedream services for the current user',
        parameters: z.object({}),
        execute: async () => {
            console.log(`Getting connected services for user: ${userId}`);
            try {
                const response = await pd.getAccounts({
                    external_user_id: userId,
                });
                return response.data?.map((account: any) => ({
                    id: account.id,
                    name: account.app.name,
                    app_slug: account.app.name_slug,
                    connected_at: account.created_at,
                    healthy: account.healthy,
                    img_src: account.app.img_src,
                    description: account.app.description,
                    auth_type: account.app.auth_type
                })) || [];
            } catch (error) {
                console.error('Error fetching connected services:', error);
                throw new Error('Failed to fetch connected services');
            }
        },
    }),

    getConnectionDetails: tool({
        description: 'Get the details of a specific Pipedream connection by its ID',
        parameters: z.object({
            id: z.string().describe('The ID of the connection to retrieve'),
        }),
        execute: async ({ id }) => {
            console.log(`Getting connection details for ${id} (user: ${userId})`);
            try {
                const response = await pd.getAccountById(id);
                return {
                    id: response.id,
                    name: response.name,
                    app: response.app,
                    created_at: response.created_at,
                    updated_at: response.updated_at,
                    healthy: response.healthy,
                    external_id: response.external_id
                };
            } catch (error) {
                console.error('Error fetching connection details:', error);
                throw new Error(`Failed to fetch connection details for ${id}`);
            }
        },
    }),

    searchForPipedreamApps: tool({
        description: 'Search for available Pipedream apps to connect to',
        parameters: z.object({
            query: z.string().describe('The name of the service to search for, e.g., "Gmail" or "Slack"'),
        }),
        execute: async ({ query }) => {
            console.log(`Searching for pipedream apps with query: ${query}`);
            try {
                const response = await pd.getApps({
                    q: query,
                });
                return response.data?.map((app: any) => ({
                    id: app.id,
                    name: app.name,
                    name_slug: app.name_slug,
                    description: app.description,
                    img_src: app.img_src,
                    auth_type: app.auth_type,
                    categories: app.categories
                })).slice(0, 10) || []; // Limit to top 10 results
            } catch (error) {
                console.error('Error searching for apps:', error);
                throw new Error(`Failed to search for apps with query: ${query}`);
            }
        },
    }),
});

// Legacy export for backward compatibility (using dummy data)
export const pipedreamTools = {
    getConnectedServices: tool({
        description: 'Get a list of connected Pipedream services',
        parameters: z.object({}),
        execute: async () => {
            console.log('getting connected services (dummy data)');
            return [
                { name: 'Google Drive', id: '123' },
                { name: 'Gmail', id: '456' },
                { name: 'Asana', id: '789' },
            ];
        },
    }),
    getConnectionDetails: tool({
        description: 'Get the details of a specific Pipedream connection by its ID',
        parameters: z.object({
            id: z.string().describe('The ID of the connection to retrieve'),
        }),
        execute: async ({ id }) => {
            console.log(`getting connection details for ${id} (dummy data)`);
            return { id, foo: 'bar', baz: 'qux', connected_at: '2025-07-01T12:00:00Z' };
        },
    }),
    searchForPipedreamApps: tool({
        description: 'Search for available Pipedream apps to connect to',
        parameters: z.object({
            query: z.string().describe('The name of the service to search for, e.g., "Gmail" or "Slack"'),
        }),
        execute: async ({ query }) => {
            console.log(`searching for pipedream apps with query: ${query} (dummy data)`);
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
    }),
}; 