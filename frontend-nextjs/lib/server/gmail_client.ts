import pd from "./pipedream_client";

interface GmailAccount {
    id: string;
    name?: string;
    email?: string;
    app?: {
        name?: string;
    };
}

interface GmailMessage {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    payload?: {
        headers?: Array<{
            name: string;
            value: string;
        }>;
        body?: {
            data?: string;
        };
        parts?: Array<{
            mimeType: string;
            body?: {
                data?: string;
            };
        }>;
    };
    internalDate?: string;
}

interface GmailDraft {
    id: string;
    message?: GmailMessage;
}

interface GmailThread {
    id: string;
    messages?: GmailMessage[];
    snippet?: string;
}

async function getGmailAccounts(userId: string): Promise<GmailAccount[]> {
    const accounts = await pd.getAccounts({
        external_user_id: userId,
    });
    const gmailAccounts = accounts.data?.filter((account: any) =>
        account.app?.name?.toLowerCase() === "gmail"
    ) || [];
    return gmailAccounts;
}

async function makeGmailRequest<T = any>(
    userId: string,
    endpoint: string,
    options: any = {},
    accountId?: string
): Promise<T> {
    const gmailAccounts = await getGmailAccounts(userId);
    if (gmailAccounts.length === 0) {
        throw new Error('No Gmail accounts found');
    }

    const targetAccountId = accountId || gmailAccounts[0].id;
    const targetAccount = gmailAccounts.find(acc => acc.id === targetAccountId);
    if (!targetAccount) {
        throw new Error(`Gmail account ${targetAccountId} not found`);
    }

    try {
        const response = await pd.makeProxyRequest(
            {
                searchParams: {
                    account_id: targetAccountId,
                    external_user_id: userId,
                }
            },
            {
                url: `https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`,
                options
            }
        );

        // Parse response if it's a string
        if (typeof response === 'string') {
            return JSON.parse(response) as T;
        }
        return response as T;
    } catch (error) {
        console.error("error", error);
        throw error;
    }
}

export const listThreads = async (
    userId: string,
    params: {
        maxResults?: number;
        pageToken?: string;
        q?: string;
        labelIds?: string[];
        includeSpamTrash?: boolean;
    } = {},
    accountId?: string
) => {
    const searchParams = new URLSearchParams();
    if (params.maxResults) searchParams.append('maxResults', params.maxResults.toString());
    if (params.pageToken) searchParams.append('pageToken', params.pageToken);
    if (params.q) searchParams.append('q', params.q);
    if (params.labelIds) params.labelIds.forEach(id => searchParams.append('labelIds', id));
    if (params.includeSpamTrash !== undefined) {
        searchParams.append('includeSpamTrash', params.includeSpamTrash.toString());
    }

    return makeGmailRequest(
        userId,
        `/threads?${searchParams.toString()}`,
        { method: "GET" },
        accountId
    );
};

export const getThread = async (
    userId: string,
    threadId: string,
    accountId?: string
): Promise<any> => {
    return makeGmailRequest(
        userId,
        `/threads/${threadId}`,
        { method: "GET" },
        accountId
    );
};

export const listMessages = async (
    userId: string,
    params: {
        maxResults?: number;
        pageToken?: string;
        q?: string;
        labelIds?: string[];
        includeSpamTrash?: boolean;
    } = {},
    accountId?: string
) => {
    const searchParams = new URLSearchParams();
    if (params.maxResults) searchParams.append('maxResults', params.maxResults.toString());
    if (params.pageToken) searchParams.append('pageToken', params.pageToken);
    if (params.q) searchParams.append('q', params.q);
    if (params.labelIds) params.labelIds.forEach(id => searchParams.append('labelIds', id));
    if (params.includeSpamTrash !== undefined) {
        searchParams.append('includeSpamTrash', params.includeSpamTrash.toString());
    }

    return makeGmailRequest(
        userId,
        `/messages?${searchParams.toString()}`,
        { method: "GET" },
        accountId
    );
};

export const getMessage = async (
    userId: string,
    messageId: string,
    accountId?: string
): Promise<any> => {
    return makeGmailRequest(
        userId,
        `/messages/${messageId}`,
        { method: "GET" },
        accountId
    );
};

export const modifyMessage = async (
    userId: string,
    messageId: string,
    modifications: {
        addLabelIds?: string[];
        removeLabelIds?: string[];
    },
    accountId?: string
) => {
    return makeGmailRequest(
        userId,
        `/messages/${messageId}/modify`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modifications)
        },
        accountId
    );
};

export const trashMessage = async (
    userId: string,
    messageId: string,
    accountId?: string
) => {
    return makeGmailRequest(
        userId,
        `/messages/${messageId}/trash`,
        { method: "POST" },
        accountId
    );
};

export const deleteMessage = async (
    userId: string,
    messageId: string,
    accountId?: string
) => {
    return makeGmailRequest(
        userId,
        `/messages/${messageId}`,
        { method: "DELETE" },
        accountId
    );
};

export const sendMessage = async (
    userId: string,
    message: {
        to: string;
        subject: string;
        body: string;
        cc?: string;
        bcc?: string;
        threadId?: string;
        inReplyTo?: string;
        references?: string;
    },
    accountId?: string
): Promise<GmailMessage> => {
    // Build proper MIME message
    const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const headers = [
        `To: ${message.to}`,
        message.cc ? `Cc: ${message.cc}` : '',
        message.bcc ? `Bcc: ${message.bcc}` : '',
        `Subject: ${message.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        message.inReplyTo ? `In-Reply-To: ${message.inReplyTo}` : '',
        message.references ? `References: ${message.references}` : '',
    ].filter(Boolean);

    // Build message parts
    const messageParts = [
        ...headers,
        '', // Empty line between headers and body
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        message.body,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        message.body.replace(/\n/g, '<br>'), // Simple HTML conversion
        '',
        `--${boundary}--`
    ];

    const email = messageParts.join('\r\n');

    const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const body: any = { raw: encodedMessage };
    if (message.threadId) {
        body.threadId = message.threadId;
    }

    return makeGmailRequest<GmailMessage>(
        userId,
        '/messages/send',
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        },
        accountId
    );
};

export const createDraft = async (
    userId: string,
    draft: {
        to: string;
        subject: string;
        body: string;
        cc?: string;
        bcc?: string;
        threadId?: string;
    },
    accountId?: string
): Promise<GmailDraft> => {
    // Build proper MIME message
    const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const headers = [
        `To: ${draft.to}`,
        draft.cc ? `Cc: ${draft.cc}` : '',
        draft.bcc ? `Bcc: ${draft.bcc}` : '',
        `Subject: ${draft.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean);

    // Build message parts
    const messageParts = [
        ...headers,
        '', // Empty line between headers and body
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        draft.body,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        draft.body.replace(/\n/g, '<br>'), // Simple HTML conversion
        '',
        `--${boundary}--`
    ];

    const email = messageParts.join('\r\n');

    const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const body: any = {
        message: { raw: encodedMessage }
    };
    if (draft.threadId) {
        body.message.threadId = draft.threadId;
    }

    return makeGmailRequest<GmailDraft>(
        userId,
        '/drafts',
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        },
        accountId
    );
};

export const listLabels = async (
    userId: string,
    accountId?: string
) => {
    return makeGmailRequest(
        userId,
        '/labels',
        { method: "GET" },
        accountId
    );
};

export { getGmailAccounts };
export const getGmailMessages = listMessages;