import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listThreads, getThread } from '@/lib/server/gmail_client';
import { db } from '@/lib/db';
import { emailThreads, emailMessages, gmailSyncHistory } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import pd from '@/lib/server/pipedream_client';

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from body or query params
    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId || req.nextUrl.searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Start sync history
    const syncId = crypto.randomUUID();
    await db.insert(gmailSyncHistory).values({
      id: syncId,
      userId,
      accountId,
      historyId: '0', // Will be updated after sync
      syncType: 'full',
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

    // Fetch the 50 most recent threads
    const threadsResponse = await listThreads(
      userId,
      {
        maxResults: 50,
        q: '-in:spam -in:trash'
      },
      accountId
    );

    const threads = threadsResponse.threads || [];
    let messagesAdded = 0;
    const processedThreadIds: string[] = [];

    // Process each thread
    for (const thread of threads) {
      if (!thread.id) continue;

      const threadDetails = await getThread(userId, thread.id, accountId);
      const messages = threadDetails.messages || [];
      
      if (messages.length === 0) continue;

      // Extract thread metadata from the first message
      const firstMessage = messages[0];
      const threadData = extractEmailParts(firstMessage);
      
      processedThreadIds.push(thread.id);

      // Upsert thread
      await db.insert(emailThreads).values({
        id: crypto.randomUUID(),
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
      for (const message of messages) {
        if (!message.id) continue;

        const messageData = extractEmailParts(message);
        const internalDate = message.internalDate 
          ? new Date(parseInt(message.internalDate))
          : new Date();

        // Extract sender name/email
        const senderMatch = messageData.from.match(/^(?:"?([^"]+)"?\s)?<?([^>]+)>?$/);
        const senderName = senderMatch ? (senderMatch[1] || senderMatch[2]) : messageData.from;

        // Upsert message
        await db.insert(emailMessages).values({
          id: crypto.randomUUID(),
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
    }

    // Update sync history with results
    await db.update(gmailSyncHistory)
      .set({
        historyId: currentHistoryId,
        messagesAdded,
        completedAt: new Date(),
      })
      .where(eq(gmailSyncHistory.id, syncId));

    // Fetch the synced threads from database in correct order
    const syncedThreads = await db
      .select({
        messageId: emailMessages.messageId,
        threadId: emailMessages.threadId,
        subject: emailMessages.subject,
        sender: emailMessages.from,
        time: emailMessages.internalDate,
      })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.userId, userId),
          eq(emailMessages.accountId, accountId),
          inArray(emailMessages.threadId, processedThreadIds)
        )
      )
      .orderBy(desc(emailMessages.internalDate))
      .limit(50);

    // Get the most recent message from each thread
    const threadMap = new Map();
    for (const message of syncedThreads) {
      if (!threadMap.has(message.threadId) || 
          (message.time && threadMap.get(message.threadId).time < message.time)) {
        threadMap.set(message.threadId, message);
      }
    }

    const threads_result = Array.from(threadMap.values()).map(thread => ({
      ...thread,
      time: thread.time?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ 
      success: true,
      syncId,
      messagesAdded,
      historyId: currentHistoryId,
      threads: threads_result
    });
  } catch (error) {
    console.error('Error syncing Gmail threads:', error);
    
    // Log error in sync history if we have a sync ID
    if (error instanceof Error && 'syncId' in error) {
      await db.update(gmailSyncHistory)
        .set({
          error: error.message,
          completedAt: new Date(),
        })
        .where(eq(gmailSyncHistory.id, error.syncId as string));
    }
    
    return NextResponse.json(
      { error: 'Failed to sync Gmail threads' },
      { status: 500 }
    );
  }
}