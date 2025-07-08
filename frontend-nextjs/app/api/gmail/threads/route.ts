import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listThreads, getThread } from '@/lib/server/gmail_client';
import { db } from '@/lib/db';
import { emailThreads, emailMessages, gmailSyncHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import pd from '@/lib/server/pipedream_client';
import { randomUUID } from 'crypto';

interface EmailThread {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  time: string;
  internalDate?: number; // For sorting purposes
}

interface Header {
  name: string;
  value: string;
}

function extractEmailParts(message: any) {
  const headers: Header[] = message.payload?.headers || [];

  const getHeader = (name: string) => headers.find((h: Header) => h.name === name)?.value || '';
  const getHeaders = (name: string) => headers
    .filter((h: Header) => h.name === name)
    .map(h => h.value)
    .filter(Boolean);

  // Extract body content
  let body = '';
  let bodyHtml = '';

  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }

  return {
    from: getHeader('From'),
    to: getHeaders('To'),
    cc: getHeaders('Cc'),
    bcc: getHeaders('Bcc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body,
    bodyHtml,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query params or use default
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Start sync history
    const syncId = randomUUID();
    await db.insert(gmailSyncHistory).values({
      id: syncId,
      userId,
      accountId,
      historyId: '0', // Will be updated after sync
      syncType: 'partial',
      startedAt: new Date(),
    });

    // Get user's profile to fetch the latest history ID
    let currentHistoryId = '0';
    try {
      const profileResponse = await pd.makeProxyRequest(
        {
          searchParams: {
            account_id: accountId,
            external_user_id: userId,
          }
        },
        {
          url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          options: { method: "GET" }
        }
      );
      
      const profile = typeof profileResponse === 'string' 
        ? JSON.parse(profileResponse) 
        : profileResponse;
      
      currentHistoryId = profile.historyId || '0';
    } catch (error) {
      console.error('Error fetching Gmail profile:', error);
      // Continue without history ID
    }

    // Fetch the 50 most recent threads from all folders (not just inbox)
    const threadsResponse = await listThreads(
      userId,
      {
        maxResults: 50,
        // Remove 'in:inbox' to get threads from all folders
        // Add query to exclude spam and trash by default
        q: '-in:spam -in:trash'
      },
      accountId
    );

    const threads = threadsResponse.threads || [];
    console.log('Threads response:', JSON.stringify(threadsResponse, null, 2));
    console.log('Number of threads:', threads.length);
    
    const fetchedThreads: EmailThread[] = [];
    let messagesAdded = 0;

    // Fetch details for each thread and persist to database
    for (const thread of threads) {
      if (!thread || !thread.id) {
        console.warn('Skipping invalid thread:', thread);
        continue;
      }

      const threadDetails = await getThread(userId, thread.id, accountId);
      const messages = threadDetails.messages || [];
      if (messages.length === 0) continue;

      // Extract thread metadata from the first message
      const firstMessage = messages[0];
      const threadData = extractEmailParts(firstMessage);
      
      // Upsert thread
      await db.insert(emailThreads).values({
        id: randomUUID(),
        threadId: thread.id,
        userId,
        accountId,
        subject: threadData.subject || 'No Subject',
        snippet: threadDetails.snippet || '',
        historyId: firstMessage.historyId || currentHistoryId,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [emailThreads.threadId, emailThreads.accountId],
        set: {
          subject: threadData.subject || 'No Subject',
          snippet: threadDetails.snippet || '',
          historyId: firstMessage.historyId || currentHistoryId,
          updatedAt: new Date(),
        }
      });

      // Process all messages in the thread
      let mostRecentMessage = null;
      let mostRecentDate = 0;
      
      for (const message of messages) {
        if (!message.id) continue;

        const messageData = extractEmailParts(message);
        const internalDate = message.internalDate 
          ? new Date(parseInt(message.internalDate))
          : new Date();

        // Track most recent message
        if (message.internalDate && parseInt(message.internalDate) > mostRecentDate) {
          mostRecentDate = parseInt(message.internalDate);
          mostRecentMessage = {
            messageData,
            message,
            internalDate
          };
        }

        // Extract sender name/email
        const senderMatch = messageData.from.match(/^(?:"?([^"]+)"?\s)?<?([^>]+)>?$/);
        const senderName = senderMatch ? (senderMatch[1] || senderMatch[2]) : messageData.from;

        // Upsert message
        await db.insert(emailMessages).values({
          id: randomUUID(),
          messageId: message.id,
          threadId: thread.id,
          userId,
          accountId,
          from: senderName,
          to: messageData.to,
          cc: messageData.cc,
          bcc: messageData.bcc,
          subject: messageData.subject || 'No Subject',
          snippet: message.snippet || '',
          body: messageData.body,
          bodyHtml: messageData.bodyHtml,
          labelIds: message.labelIds || [],
          isUnread: message.labelIds?.includes('UNREAD') || false,
          historyId: message.historyId || currentHistoryId,
          internalDate,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [emailMessages.messageId, emailMessages.accountId],
          set: {
            from: senderName,
            to: messageData.to,
            cc: messageData.cc,
            bcc: messageData.bcc,
            subject: messageData.subject || 'No Subject',
            snippet: message.snippet || '',
            body: messageData.body,
            bodyHtml: messageData.bodyHtml,
            labelIds: message.labelIds || [],
            isUnread: message.labelIds?.includes('UNREAD') || false,
            historyId: message.historyId || currentHistoryId,
            internalDate,
            updatedAt: new Date(),
          }
        });

        messagesAdded++;
      }

      // Use the most recent message for the thread display
      if (mostRecentMessage) {
        const { messageData, message, internalDate } = mostRecentMessage;
        const senderMatch = messageData.from.match(/^(?:"?([^"]+)"?\s)?<?([^>]+)>?$/);
        const sender = senderMatch ? (senderMatch[1] || senderMatch[2]) : messageData.from;

        fetchedThreads.push({
          messageId: message.id || '',
          threadId: thread.id,
          subject: messageData.subject || 'No Subject',
          sender,
          time: internalDate.toISOString(),
          internalDate: mostRecentDate
        });
        
        console.log(`[${thread.id}] ${messageData.subject} from ${sender} at ${internalDate.toISOString()}`);
      }
    }

    // Update sync history with results
    await db.update(gmailSyncHistory)
      .set({
        historyId: currentHistoryId,
        messagesAdded,
        completedAt: new Date(),
      })
      .where(eq(gmailSyncHistory.id, syncId));

    // Sort threads by most recent message date (descending)
    fetchedThreads.sort((a, b) => (b.internalDate || 0) - (a.internalDate || 0));

    return NextResponse.json({ 
      threads: fetchedThreads,
      syncId,
      historyId: currentHistoryId,
      messagesStored: messagesAdded
    });
  } catch (error) {
    console.error('Error fetching Gmail threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail threads' },
      { status: 500 }
    );
  }
}