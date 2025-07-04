import { tool } from "ai";
import { z } from "zod";
import {
    listThreads,
    getThread,
    listMessages,
    getMessage,
    modifyMessage,
    trashMessage,
    deleteMessage,
    sendMessage,
    createDraft,
    listLabels,
    getGmailAccounts
} from "../server/gmail_client";

const extractEmailDetails = (message: any) => {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    const extractBody = (payload: any): string => {
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                    if (part.body?.data) {
                        return Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }
                }
                if (part.parts) {
                    const nestedBody = extractBody(part);
                    if (nestedBody) return nestedBody;
                }
            }
        }
        
        return '';
    };
    
    return {
        id: message.id,
        threadId: message.threadId,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        snippet: message.snippet,
        body: extractBody(message.payload || {}),
        labels: message.labelIds || [],
        messageId: getHeader('message-id'),
        inReplyTo: getHeader('in-reply-to'),
        references: getHeader('references'),
    };
};

const formatThreadSummary = (thread: any) => {
    const messages = thread.messages || [];
    const latestMessage = messages[messages.length - 1];
    
    if (!latestMessage) return thread;
    
    const headers = latestMessage.payload?.headers || [];
    const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    return {
        id: thread.id,
        messageCount: messages.length,
        snippet: thread.snippet,
        subject: getHeader('subject'),
        from: getHeader('from'),
        date: getHeader('date'),
        participants: [...new Set(messages.flatMap((m: any) => {
            const h = m.payload?.headers || [];
            return [
                h.find((header: any) => header.name === 'From')?.value,
                h.find((header: any) => header.name === 'To')?.value,
            ].filter(Boolean);
        }))],
    };
};

export const createGmailTools = (userId: string) => ({
    listRecentThreads: tool({
        description: 'List recent email threads from Gmail (optionally from a specific account)',
        parameters: z.object({
            maxResults: z.number().optional().default(10).describe('Number of threads to return'),
            query: z.string().optional().describe('Optional search query (e.g., "is:unread", "from:someone@email.com")'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ maxResults, query, accountId }) => {
            try {
                const result = await listThreads(userId, { maxResults, q: query }, accountId);
                const threads = result.threads || [];
                
                const threadDetails = await Promise.all(
                    threads.slice(0, 5).map(async (t: any) => {
                        const fullThread = await getThread(userId, t.id, accountId);
                        return formatThreadSummary(fullThread);
                    })
                );
                
                return {
                    threads: threadDetails,
                    totalResults: result.resultSizeEstimate,
                    nextPageToken: result.nextPageToken
                };
            } catch (error) {
                throw new Error(`Failed to list threads: ${error}`);
            }
        },
    }),

    viewThreadDetails: tool({
        description: 'View the full details of an email thread including all messages',
        parameters: z.object({
            threadId: z.string().describe('The thread ID to retrieve'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ threadId, accountId }) => {
            try {
                const thread = await getThread(userId, threadId, accountId);
                const messages = (thread.messages || []).map(extractEmailDetails);
                
                return {
                    id: thread.id,
                    messages,
                    messageCount: messages.length
                };
            } catch (error) {
                throw new Error(`Failed to get thread details: ${error}`);
            }
        },
    }),

    archiveMessage: tool({
        description: 'Archive an email message (remove INBOX label)',
        parameters: z.object({
            messageId: z.string().describe('The message ID to archive'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ messageId, accountId }) => {
            try {
                await modifyMessage(
                    userId,
                    messageId,
                    { removeLabelIds: ['INBOX'] },
                    accountId
                );
                return { success: true, messageId, action: 'archived' };
            } catch (error) {
                throw new Error(`Failed to archive message: ${error}`);
            }
        },
    }),

    deleteMessage: tool({
        description: 'Permanently delete an email message',
        parameters: z.object({
            messageId: z.string().describe('The message ID to delete'),
            permanent: z.boolean().optional().default(false).describe('If true, permanently delete. If false, move to trash.'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ messageId, permanent, accountId }) => {
            try {
                if (permanent) {
                    await deleteMessage(userId, messageId, accountId);
                    return { success: true, messageId, action: 'permanently_deleted' };
                } else {
                    await trashMessage(userId, messageId, accountId);
                    return { success: true, messageId, action: 'moved_to_trash' };
                }
            } catch (error) {
                throw new Error(`Failed to delete message: ${error}`);
            }
        },
    }),

    addLabel: tool({
        description: 'Add one or more labels to an email message',
        parameters: z.object({
            messageId: z.string().describe('The message ID to label'),
            labelIds: z.array(z.string()).describe('Array of label IDs to add'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ messageId, labelIds, accountId }) => {
            try {
                await modifyMessage(
                    userId,
                    messageId,
                    { addLabelIds: labelIds },
                    accountId
                );
                return { success: true, messageId, labelsAdded: labelIds };
            } catch (error) {
                throw new Error(`Failed to add labels: ${error}`);
            }
        },
    }),

    markAsRead: tool({
        description: 'Mark an email message as read or unread',
        parameters: z.object({
            messageId: z.string().describe('The message ID to modify'),
            read: z.boolean().default(true).describe('True to mark as read, false to mark as unread'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ messageId, read, accountId }) => {
            try {
                if (read) {
                    await modifyMessage(
                        userId,
                        messageId,
                        { removeLabelIds: ['UNREAD'] },
                        accountId
                    );
                } else {
                    await modifyMessage(
                        userId,
                        messageId,
                        { addLabelIds: ['UNREAD'] },
                        accountId
                    );
                }
                return { success: true, messageId, markedAs: read ? 'read' : 'unread' };
            } catch (error) {
                throw new Error(`Failed to mark message: ${error}`);
            }
        },
    }),

    findEmails: tool({
        description: 'Search for emails using Gmail search syntax',
        parameters: z.object({
            query: z.string().describe('Search query (e.g., "from:john@example.com subject:meeting")'),
            maxResults: z.number().optional().default(10).describe('Maximum number of results'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ query, maxResults, accountId }) => {
            try {
                const result = await listMessages(userId, { q: query, maxResults }, accountId);
                const messages = result.messages || [];
                
                const messageDetails = await Promise.all(
                    messages.slice(0, Math.min(5, maxResults)).map(async (m: any) => {
                        const fullMessage = await getMessage(userId, m.id, accountId);
                        return extractEmailDetails(fullMessage);
                    })
                );
                
                return {
                    messages: messageDetails,
                    totalResults: result.resultSizeEstimate,
                    query
                };
            } catch (error) {
                throw new Error(`Failed to search emails: ${error}`);
            }
        },
    }),

    draftMessage: tool({
        description: 'Create a draft email message',
        parameters: z.object({
            to: z.string().describe('Recipient email address'),
            subject: z.string().describe('Email subject'),
            body: z.string().describe('Email body content'),
            cc: z.string().optional().describe('CC recipients (comma-separated)'),
            bcc: z.string().optional().describe('BCC recipients (comma-separated)'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ to, subject, body, cc, bcc, accountId }) => {
            try {
                const draft = await createDraft(
                    userId,
                    { to, subject, body, cc, bcc },
                    accountId
                );
                return { 
                    success: true, 
                    draftId: draft.id,
                    message: 'Draft created successfully'
                };
            } catch (error) {
                throw new Error(`Failed to create draft: ${error}`);
            }
        },
    }),

    sendEmail: tool({
        description: 'Send an email message',
        parameters: z.object({
            to: z.string().describe('Recipient email address'),
            subject: z.string().describe('Email subject'),
            body: z.string().describe('Email body content'),
            cc: z.string().optional().describe('CC recipients (comma-separated)'),
            bcc: z.string().optional().describe('BCC recipients (comma-separated)'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ to, subject, body, cc, bcc, accountId }) => {
            try {
                const result = await sendMessage(
                    userId,
                    { to, subject, body, cc, bcc },
                    accountId
                );
                return { 
                    success: true, 
                    messageId: result.id,
                    threadId: result.threadId,
                    message: 'Email sent successfully'
                };
            } catch (error) {
                throw new Error(`Failed to send email: ${error}`);
            }
        },
    }),

    replyInThread: tool({
        description: 'Reply to an email thread',
        parameters: z.object({
            threadId: z.string().describe('The thread ID to reply to'),
            body: z.string().describe('Reply message content'),
            replyAll: z.boolean().optional().default(false).describe('Reply to all recipients'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ threadId, body, replyAll, accountId }) => {
            try {
                const thread = await getThread(userId, threadId, accountId);
                const lastMessage = thread.messages?.[thread.messages.length - 1];
                
                if (!lastMessage) {
                    throw new Error('No messages found in thread');
                }
                
                const headers = lastMessage.payload?.headers || [];
                const getHeader = (name: string) => 
                    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
                
                const from = getHeader('from');
                const to = getHeader('to');
                const cc = getHeader('cc');
                const subject = getHeader('subject');
                const messageId = getHeader('message-id');
                const existingReferences = getHeader('references');
                
                // Build proper References header chain
                let references = existingReferences;
                if (messageId) {
                    references = existingReferences 
                        ? `${existingReferences} ${messageId}` 
                        : messageId;
                }
                
                let recipients = from;
                let ccRecipients = '';
                
                if (replyAll) {
                    const allRecipients = [from, to].filter(Boolean).join(', ');
                    recipients = allRecipients;
                    ccRecipients = cc;
                }
                
                const replySubject = subject.startsWith('Re:') || subject.startsWith('RE:') 
                    ? subject 
                    : `Re: ${subject}`;
                
                const result = await sendMessage(
                    userId,
                    {
                        to: recipients,
                        cc: ccRecipients,
                        subject: replySubject,
                        body,
                        threadId,
                        inReplyTo: messageId,
                        references: references
                    },
                    accountId
                );
                
                return { 
                    success: true, 
                    messageId: result.id,
                    threadId: result.threadId,
                    message: 'Reply sent successfully'
                };
            } catch (error) {
                throw new Error(`Failed to reply to thread: ${error}`);
            }
        },
    }),

    forwardEmail: tool({
        description: 'Forward an email message',
        parameters: z.object({
            messageId: z.string().describe('The message ID to forward'),
            to: z.string().describe('Recipient email address'),
            additionalMessage: z.string().optional().describe('Additional message to include'),
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ messageId, to, additionalMessage, accountId }) => {
            try {
                const message = await getMessage(userId, messageId, accountId);
                const details = extractEmailDetails(message);
                
                const forwardSubject = details.subject.startsWith('Fwd:') 
                    ? details.subject 
                    : `Fwd: ${details.subject}`;
                
                const forwardBody = `${additionalMessage ? additionalMessage + '\n\n' : ''}
---------- Forwarded message ---------
From: ${details.from}
Date: ${details.date}
Subject: ${details.subject}
To: ${details.to}

${details.body}`;
                
                const result = await sendMessage(
                    userId,
                    {
                        to,
                        subject: forwardSubject,
                        body: forwardBody,
                    },
                    accountId
                );
                
                return { 
                    success: true, 
                    messageId: result.id,
                    message: 'Email forwarded successfully'
                };
            } catch (error) {
                throw new Error(`Failed to forward email: ${error}`);
            }
        },
    }),

    listGmailAccounts: tool({
        description: 'List all connected Gmail accounts',
        parameters: z.object({}),
        execute: async () => {
            try {
                const accounts = await getGmailAccounts(userId);
                return {
                    accounts: accounts.map((acc: any) => ({
                        id: acc.id,
                        email: acc.email || acc.name || 'Unknown',
                        name: acc.name
                    })),
                    count: accounts.length
                };
            } catch (error) {
                throw new Error(`Failed to list Gmail accounts: ${error}`);
            }
        },
    }),

    listLabels: tool({
        description: 'List all available Gmail labels',
        parameters: z.object({
            accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
        }),
        execute: async ({ accountId }) => {
            try {
                const result = await listLabels(userId, accountId);
                return {
                    labels: result.labels || [],
                    count: result.labels?.length || 0
                };
            } catch (error) {
                throw new Error(`Failed to list labels: ${error}`);
            }
        },
    }),
});