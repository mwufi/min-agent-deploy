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

// Helper function to find label by name (fuzzy matching)
const findLabelByName = async (userId: string, labelName: string, accountId?: string) => {
    try {
        const result = await listLabels(userId, accountId);
        const labels = result.labels || [];
        
        // Exact match first
        let label = labels.find((l: any) => 
            l.name.toLowerCase() === labelName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!label) {
            label = labels.find((l: any) => 
                l.name.toLowerCase().includes(labelName.toLowerCase()) ||
                labelName.toLowerCase().includes(l.name.toLowerCase())
            );
        }
        
        // If still no match, try fuzzy match
        if (!label) {
            const normalizedSearch = labelName.toLowerCase().replace(/[^a-z0-9]/g, '');
            label = labels.find((l: any) => {
                const normalizedLabel = l.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalizedLabel.includes(normalizedSearch) || 
                       normalizedSearch.includes(normalizedLabel);
            });
        }
        
        return label;
    } catch (error) {
        return null;
    }
};

// Helper to suggest alternative searches
const suggestAlternativeSearches = (originalQuery: string, noResults: boolean) => {
    const suggestions = [];
    
    if (noResults) {
        // Remove quotes if present
        if (originalQuery.includes('"')) {
            suggestions.push(originalQuery.replace(/"/g, ''));
        }
        
        // Try broader search
        if (originalQuery.includes(' AND ')) {
            suggestions.push(originalQuery.replace(/ AND /g, ' OR '));
        }
        
        // Remove date filters
        if (originalQuery.includes('newer_than:') || originalQuery.includes('older_than:')) {
            suggestions.push(originalQuery.replace(/\s*(newer|older)_than:\S+/g, ''));
        }
        
        // Try without label
        if (originalQuery.includes('label:')) {
            suggestions.push(originalQuery.replace(/\s*label:\S+/g, ''));
        }
    }
    
    return suggestions;
};

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

export const createGmailToolsEnhanced = (userId: string, defaultAccountId?: string, systemPromptAddition?: string) => {
    // Helper to get account details
    const getAccountDetails = async (accountId?: string) => {
        const accounts = await getGmailAccounts(userId);
        const targetAccountId = accountId || defaultAccountId || accounts[0]?.id;
        const account = accounts.find(acc => acc.id === targetAccountId);
        return {
            accountId: targetAccountId,
            accountEmail: account?.email || account?.name || 'Unknown account'
        };
    };

    return {
        findEmailsByLabel: tool({
            description: 'Search for emails by label name (not ID). The AI will find the correct label ID for you.',
            parameters: z.object({
                labelName: z.string().describe('The name of the label (e.g., "Dracula Daily", "Important", "Work")'),
                maxResults: z.number().optional().default(10).describe('Number of results to return'),
                accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
            }),
            execute: async ({ labelName, maxResults, accountId }) => {
                try {
                    // First, find the label by name
                    const label = await findLabelByName(userId, labelName, accountId || defaultAccountId);
                    
                    if (!label) {
                        // If no label found, list all labels to help
                        const allLabels = await listLabels(userId, accountId || defaultAccountId);
                        const labelNames = (allLabels.labels || []).map((l: any) => l.name);
                        
                        return {
                            success: false,
                            error: `Label "${labelName}" not found`,
                            availableLabels: labelNames,
                            suggestion: "Try one of the available labels listed above, or check if the label name is spelled correctly."
                        };
                    }

                    // Now search with the label ID
                    const result = await listMessages(
                        userId, 
                        { q: `label:"${label.name}"`, maxResults }, 
                        accountId || defaultAccountId
                    );
                    
                    const messages = result.messages || [];

                    if (messages.length === 0) {
                        return {
                            success: true,
                            labelName: label.name,
                            labelId: label.id,
                            messages: [],
                            totalResults: 0,
                            suggestion: "No emails found in this label. The label exists but is empty."
                        };
                    }

                    const messageDetails = await Promise.all(
                        messages.slice(0, Math.min(5, maxResults)).map(async (m: any) => {
                            const fullMessage = await getMessage(userId, m.id, accountId || defaultAccountId);
                            return extractEmailDetails(fullMessage);
                        })
                    );

                    return {
                        success: true,
                        labelName: label.name,
                        labelId: label.id,
                        messages: messageDetails,
                        totalResults: result.resultSizeEstimate
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to search by label: ${error}`,
                        suggestion: "Try listing all labels first to see what's available."
                    };
                }
            },
        }),

        searchEmailsSmartly: tool({
            description: 'Search emails with smart fallbacks. If no results, will suggest and try alternative searches.',
            parameters: z.object({
                query: z.string().describe('Search query'),
                maxResults: z.number().optional().default(10),
                tryAlternatives: z.boolean().optional().default(true).describe('Try alternative searches if no results'),
                accountId: z.string().optional(),
            }),
            execute: async ({ query, maxResults, tryAlternatives, accountId }) => {
                try {
                    // First attempt
                    let result = await listMessages(userId, { q: query, maxResults }, accountId || defaultAccountId);
                    let messages = result.messages || [];

                    // If no results and tryAlternatives is true
                    if (messages.length === 0 && tryAlternatives) {
                        const alternatives = suggestAlternativeSearches(query, true);
                        const attempts = [];

                        for (const altQuery of alternatives) {
                            const altResult = await listMessages(
                                userId, 
                                { q: altQuery, maxResults }, 
                                accountId || defaultAccountId
                            );
                            attempts.push({
                                query: altQuery,
                                resultCount: altResult.messages?.length || 0
                            });

                            if (altResult.messages && altResult.messages.length > 0) {
                                result = altResult;
                                messages = altResult.messages;
                                break;
                            }
                        }

                        if (messages.length === 0) {
                            return {
                                success: true,
                                originalQuery: query,
                                messages: [],
                                totalResults: 0,
                                alternativeSearchesAttempted: attempts,
                                suggestions: [
                                    "Try searching with fewer keywords",
                                    "Check if the sender's email is spelled correctly",
                                    "Try searching by subject line only",
                                    "Remove date filters if any",
                                    "Search for partial words instead of exact phrases"
                                ]
                            };
                        }
                    }

                    const messageDetails = await Promise.all(
                        messages.slice(0, Math.min(5, maxResults)).map(async (m: any) => {
                            const fullMessage = await getMessage(userId, m.id, accountId || defaultAccountId);
                            return extractEmailDetails(fullMessage);
                        })
                    );

                    return {
                        success: true,
                        query: result === result ? query : "Alternative search succeeded",
                        messages: messageDetails,
                        totalResults: result.resultSizeEstimate,
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Search failed: ${error}`,
                        suggestions: [
                            "Check your search syntax",
                            "Try simpler search terms",
                            "Make sure the Gmail account is properly connected"
                        ]
                    };
                }
            },
        }),

        addLabelByName: tool({
            description: 'Add a label to an email by label name (not ID)',
            parameters: z.object({
                messageId: z.string().describe('The message ID to label'),
                labelName: z.string().describe('The name of the label to add'),
                createIfMissing: z.boolean().optional().default(false).describe('Create the label if it doesn\'t exist'),
                accountId: z.string().optional(),
            }),
            execute: async ({ messageId, labelName, createIfMissing, accountId }) => {
                try {
                    // Find the label
                    let label = await findLabelByName(userId, labelName, accountId || defaultAccountId);
                    
                    if (!label) {
                        if (createIfMissing) {
                            // TODO: Implement label creation
                            return {
                                success: false,
                                error: `Label "${labelName}" not found and label creation is not yet implemented`,
                                suggestion: "Use an existing label or create it manually in Gmail first"
                            };
                        } else {
                            const allLabels = await listLabels(userId, accountId || defaultAccountId);
                            const labelNames = (allLabels.labels || []).map((l: any) => l.name);
                            
                            return {
                                success: false,
                                error: `Label "${labelName}" not found`,
                                availableLabels: labelNames.slice(0, 20), // Show first 20
                                suggestion: "Choose from the available labels above"
                            };
                        }
                    }

                    await modifyMessage(
                        userId,
                        messageId,
                        { addLabelIds: [label.id] },
                        accountId || defaultAccountId
                    );

                    return { 
                        success: true, 
                        messageId, 
                        labelAdded: label.name,
                        labelId: label.id 
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to add label: ${error}`,
                        suggestion: "Make sure the message ID is correct"
                    };
                }
            },
        }),

        removeLabelByName: tool({
            description: 'Remove a label from an email by label name (not ID)',
            parameters: z.object({
                messageId: z.string().describe('The message ID to unlabel'),
                labelName: z.string().describe('The name of the label to remove'),
                accountId: z.string().optional(),
            }),
            execute: async ({ messageId, labelName, accountId }) => {
                try {
                    // Find the label
                    const label = await findLabelByName(userId, labelName, accountId || defaultAccountId);
                    
                    if (!label) {
                        return {
                            success: false,
                            error: `Label "${labelName}" not found`,
                            suggestion: "List the message details first to see what labels it currently has"
                        };
                    }

                    await modifyMessage(
                        userId,
                        messageId,
                        { removeLabelIds: [label.id] },
                        accountId || defaultAccountId
                    );

                    return { 
                        success: true, 
                        messageId, 
                        labelRemoved: label.name,
                        labelId: label.id 
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to remove label: ${error}`,
                        suggestion: "Make sure the message ID is correct and the label is actually on the message"
                    };
                }
            },
        }),

        // Include all original tools with enhanced error handling
        listRecentThreads: tool({
            description: 'List recent email threads from Gmail',
            parameters: z.object({
                maxResults: z.number().optional().default(10).describe('Number of threads to return'),
                query: z.string().optional().describe('Optional search query (e.g., "is:unread", "from:someone@email.com")'),
                accountId: z.string().optional().describe('Specific Gmail account ID (optional)'),
            }),
            execute: async ({ maxResults, query, accountId }) => {
                try {
                    const result = await listThreads(userId, { maxResults, q: query }, accountId || defaultAccountId);
                    const threads = result.threads || [];

                    if (threads.length === 0 && query) {
                        return {
                            threads: [],
                            totalResults: 0,
                            query,
                            suggestions: [
                                "Try a simpler search query",
                                "Remove filters like 'is:unread' or date ranges",
                                "Check spelling of email addresses",
                                "Try searching without quotes"
                            ]
                        };
                    }

                    const threadDetails = await Promise.all(
                        threads.slice(0, 5).map(async (t: any) => {
                            const fullThread = await getThread(userId, t.id, accountId || defaultAccountId);
                            return formatThreadSummary(fullThread);
                        })
                    );

                    const { accountEmail } = await getAccountDetails(accountId);

                    return {
                        threads: threadDetails.map(t => ({ ...t, accountEmail })),
                        totalResults: result.resultSizeEstimate,
                        nextPageToken: result.nextPageToken,
                        accountEmail
                    };
                } catch (error) {
                    return {
                        error: `Failed to list threads: ${error}`,
                        suggestion: "Make sure your Gmail account is properly connected. Try refreshing the page."
                    };
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
                    const thread = await getThread(userId, threadId, accountId || defaultAccountId);
                    const messages = (thread.messages || []).map(extractEmailDetails);

                    return {
                        id: thread.id,
                        messages,
                        messageCount: messages.length
                    };
                } catch (error) {
                    return {
                        error: `Failed to get thread details: ${error}`,
                        suggestion: "Make sure the thread ID is correct. You can get thread IDs from listRecentThreads."
                    };
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
                        accountId || defaultAccountId
                    );
                    return { success: true, messageId, action: 'archived' };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to archive message: ${error}`,
                        suggestion: "Make sure the message ID is correct and the message is in the inbox."
                    };
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
                    return {
                        success: false,
                        error: `Failed to delete message: ${error}`,
                        suggestion: "Make sure the message ID is correct."
                    };
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
                            accountId || defaultAccountId
                        );
                    } else {
                        await modifyMessage(
                            userId,
                            messageId,
                            { addLabelIds: ['UNREAD'] },
                            accountId || defaultAccountId
                        );
                    }
                    return { success: true, messageId, markedAs: read ? 'read' : 'unread' };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to mark message: ${error}`,
                        suggestion: "Make sure the message ID is correct."
                    };
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
                    const { accountEmail } = await getAccountDetails(accountId);
                    const draft = await createDraft(
                        userId,
                        { to, subject, body, cc, bcc },
                        accountId || defaultAccountId
                    );
                    return {
                        success: true,
                        draftId: draft.id,
                        message: 'Draft created successfully',
                        to,
                        cc,
                        bcc,
                        subject,
                        preview: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
                        accountEmail,
                        gmailLink: `https://mail.google.com/mail/u/0/#drafts/${draft.id}`
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to create draft: ${error}`,
                        suggestion: "Check that email addresses are valid."
                    };
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
                    const { accountEmail } = await getAccountDetails(accountId);
                    const result = await sendMessage(
                        userId,
                        { to, subject, body, cc, bcc },
                        accountId || defaultAccountId
                    );
                    return {
                        success: true,
                        messageId: result.id,
                        threadId: result.threadId,
                        message: 'Email sent successfully',
                        to,
                        cc,
                        bcc,
                        subject,
                        preview: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
                        accountEmail,
                        gmailLink: `https://mail.google.com/mail/u/0/#sent/${result.id}`
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to send email: ${error}`,
                        suggestion: "Check that all email addresses are valid and you have permission to send."
                    };
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
                        return {
                            success: false,
                            error: 'No messages found in thread',
                            suggestion: 'Make sure the thread ID is correct.'
                        };
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
                        accountId || defaultAccountId
                    );

                    return {
                        success: true,
                        messageId: result.id,
                        threadId: result.threadId,
                        message: 'Reply sent successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to reply to thread: ${error}`,
                        suggestion: 'Make sure the thread ID is correct and you have permission to send.'
                    };
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
                        accountId || defaultAccountId
                    );

                    return {
                        success: true,
                        messageId: result.id,
                        message: 'Email forwarded successfully'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to forward email: ${error}`,
                        suggestion: 'Make sure the message ID and recipient email are correct.'
                    };
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
                    return {
                        error: `Failed to list Gmail accounts: ${error}`,
                        suggestion: 'Try refreshing the page or reconnecting your Gmail account.'
                    };
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
                    const labels = result.labels || [];
                    
                    // Categorize labels for better organization
                    const systemLabels = labels.filter((l: any) => l.type === 'system');
                    const userLabels = labels.filter((l: any) => l.type === 'user');
                    
                    return {
                        labels,
                        systemLabels: systemLabels.map((l: any) => ({ id: l.id, name: l.name })),
                        userLabels: userLabels.map((l: any) => ({ id: l.id, name: l.name })),
                        count: labels.length,
                        userLabelCount: userLabels.length,
                        systemLabelCount: systemLabels.length
                    };
                } catch (error) {
                    return {
                        error: `Failed to list labels: ${error}`,
                        suggestion: 'Make sure your Gmail account is properly connected.'
                    };
                }
            },
        }),
    }
};