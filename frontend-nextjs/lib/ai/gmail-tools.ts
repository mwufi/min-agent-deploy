import { tool } from "ai";
import { z } from "zod";
import { getGmailMessages } from "../server/gmail_client";

export const createGmailTools = (userId: string) => ({
    getGmailMessages: tool({
        description: 'Get a list of messages from the user\'s Gmail account',
        parameters: z.object({
            query: z.string().describe('The query to search for messages'),
        }),
        execute: async ({ query }) => {
            const messages = await getGmailMessages(userId, query);
            console.log("gmail messages", messages);
            return messages;
        },
    }),
});